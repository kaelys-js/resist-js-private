/**
 * Transition manager module.
 *
 * The core transition engine for the WebForge runtime. Provides
 * {@link playTransition} to play any of the 53 transition types as a
 * GPU post-process effect, {@link applyTransitionEasing} for 6 easing
 * curves, and convenience wrappers ({@link fadeToBlack}, {@link fadeToWhite},
 * {@link fadeToColor}, {@link screenFlash}, {@link screenTint}).
 *
 * All functions return `BabylonResult<TransitionHandle>` — never throws.
 * The transition auto-disposes when its duration completes, or can be
 * manually disposed early via the returned handle.
 *
 * @example
 * ```typescript
 * import { playTransition, fadeToBlack, applyTransitionEasing } from './transition-manager';
 *
 * // Play a custom transition
 * const result = playTransition({
 *   scene, camera, engine,
 *   config: { type: 'circleIris', durationMs: 800, easing: 'easeOut' },
 * });
 * if (!result.ok) return result;
 * // Dispose early if needed
 * result.data.dispose();
 *
 * // Convenience wrapper
 * const fade = fadeToBlack({ scene, camera, engine });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Num } from '@/schemas/common';
import { ERRORS, err } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
	TransitionConfigSchema,
	type Color3,
	type TransitionConfig,
	type TransitionEasing,
} from '../schemas/transition-config';
import { TRANSITION_TYPE_MAP, createTransitionPostProcess } from './transition-shader';

// =============================================================================
// Types
// =============================================================================

/**
 * Handle returned by {@link playTransition} for manual disposal.
 *
 * Calling `dispose()` detaches the PostProcess from the camera and
 * cleans up the render observer. Safe to call multiple times.
 *
 * @example
 * ```typescript
 * const result = playTransition({ scene, camera, engine, config: { type: 'fade' } });
 * if (!result.ok) return result;
 * const handle: TransitionHandle = result.data;
 * handle.dispose(); // manual cleanup
 * handle.dispose(); // safe — no-op
 * ```
 */
export type TransitionHandle = {
	readonly dispose: () => void;
};

/**
 * Options for {@link playTransition}.
 *
 * @example
 * ```typescript
 * const options: PlayTransitionOptions = {
 *   scene,
 *   camera,
 *   engine,
 *   config: { type: 'wipe', direction: 'right', durationMs: 500 },
 * };
 * ```
 */
type PlayTransitionOptions = {
	readonly scene: BABYLON.Scene;
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.AbstractEngine;
	readonly config: Record<string, unknown>;
};

/**
 * Shared options for convenience wrapper functions.
 *
 * @example
 * ```typescript
 * const options: CommonTransitionOptions = {
 *   scene,
 *   camera,
 *   engine,
 *   durationMs: 500,
 * };
 * ```
 */
type CommonTransitionOptions = {
	readonly scene: BABYLON.Scene;
	readonly camera: BABYLON.Camera;
	readonly engine: BABYLON.AbstractEngine;
	readonly durationMs?: Num;
};

// =============================================================================
// Direction Map
// =============================================================================

/** Maps direction strings to integer values matching the GLSL shader uniform. */
const DIRECTION_MAP: Readonly<Record<string, number>> = {
	left: 0,
	right: 1,
	up: 2,
	down: 3,
};

/** Maps axis strings to integer values matching the GLSL shader uniform. */
const AXIS_MAP: Readonly<Record<string, number>> = {
	horizontal: 0,
	vertical: 1,
};

// =============================================================================
// Easing
// =============================================================================

/** Back easing constant c1. */
const EASE_BACK_C1 = 1.701_58;

/** Back easing constant c3 = c1 + 1. */
const EASE_BACK_C3: number = EASE_BACK_C1 + 1;

/**
 * Applies an easing function to a linear progress value.
 *
 * Supports 6 easing curves: `linear`, `easeIn` (cubic), `easeOut` (cubic),
 * `easeInOut` (cubic), `easeOutBack` (overshoot), `easeInOutCubic`.
 *
 * @param t - Linear progress value, typically in the 0-1 range.
 * @param easing - The easing function to apply.
 * @returns The eased value.
 *
 * @example
 * ```typescript
 * import { applyTransitionEasing } from './transition-manager';
 *
 * const eased = applyTransitionEasing(0.5, 'easeInOut'); // ~0.5
 * const linear = applyTransitionEasing(0.3, 'linear'); // 0.3
 * const overshoot = applyTransitionEasing(0.4, 'easeOutBack'); // > 0.4
 * ```
 */
export function applyTransitionEasing(t: Num, easing: TransitionEasing): Num {
	switch (easing) {
		case 'linear': {
			return t as Num;
		}
		case 'easeIn': {
			return (t * t * t) as Num;
		}
		case 'easeOut': {
			return (1 - (1 - t) ** 3) as Num;
		}
		case 'easeInOut': {
			return (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) as Num;
		}
		case 'easeOutBack': {
			return (1 + EASE_BACK_C3 * (t - 1) ** 3 + EASE_BACK_C1 * (t - 1) ** 2) as Num;
		}
		case 'easeInOutCubic': {
			return (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) as Num;
		}
	}
}

// =============================================================================
// playTransition
// =============================================================================

/**
 * Plays a screen transition using the GPU uber-shader.
 *
 * Validates the config via {@link TransitionConfigSchema}, creates a
 * PostProcess with all required uniforms, and animates progress from
 * 0 to 1 over the configured duration. The transition holds its final
 * state until explicitly disposed via the returned handle.
 *
 * For "Out" transitions (reverse=false), the PostProcess is created
 * then immediately detached. It polls `isReady()` each frame and
 * reattaches once the shader is compiled — preventing a black flash
 * on the very first transition play. "In" transitions (reverse=true)
 * start from bgColor, so any black frame during compilation is
 * invisible and no deferral is needed.
 *
 * @param options - Scene, camera, engine, and transition config.
 * @returns BabylonResult containing a {@link TransitionHandle} for disposal.
 *
 * @example
 * ```typescript
 * import { playTransition } from './transition-manager';
 *
 * const result = playTransition({
 *   scene, camera, engine,
 *   config: { type: 'circleIris', durationMs: 800, centerX: 0.3 },
 * });
 * if (!result.ok) return result;
 * // Holds final state after 800ms — call dispose() to remove
 * result.data.dispose();
 * ```
 */
export function playTransition(options: PlayTransitionOptions): BabylonResult<TransitionHandle> {
	// -------------------------------------------------------------------------
	// 1. Validate config
	// -------------------------------------------------------------------------
	const configResult = safeParse(TransitionConfigSchema, options.config);
	if (!configResult.ok) {
		return err(ERRORS.VALIDATION.SCHEMA_FAILED, configResult.error.message);
	}
	const config: TransitionConfig = configResult.data;

	// -------------------------------------------------------------------------
	// 2. Create PostProcess (auto-attaches to camera via constructor).
	//    For "Out" transitions we detach immediately and defer reattachment
	//    until the shader is compiled — see step 5. "In" transitions start
	//    from bgColor so any black frame during compilation is invisible.
	// -------------------------------------------------------------------------
	const ppResult = createTransitionPostProcess({
		engine: options.engine as BABYLON.Engine,
		camera: options.camera,
	});
	if (!ppResult.ok) {
		return ppResult;
	}
	const pp: BABYLON.PostProcess = ppResult.data;

	// Only detach for non-reverse (Out) transitions to prevent black flash.
	// Reverse (In) transitions start from bgColor, so black is fine.
	if (!config.reverse) {
		options.camera.detachPostProcess(pp);
	}

	// -------------------------------------------------------------------------
	// 3. Set up uniform application — reset startTime on first render to
	//    guarantee progress=0 on the first frame.
	// -------------------------------------------------------------------------
	let firstFrame = true;
	let startTime: number = performance.now();
	const { durationMs } = config;

	pp.onApply = (effect: BABYLON.Effect): void => {
		if (firstFrame) {
			firstFrame = false;
			startTime = performance.now();
		}

		const elapsed: number = performance.now() - startTime;
		const rawProgress: number = Math.min(elapsed / durationMs, 1);
		const easedProgress: Num = applyTransitionEasing(rawProgress as Num, config.easing);

		// Shared uniforms
		effect.setFloat('progress', easedProgress);
		effect.setInt('maskType', TRANSITION_TYPE_MAP[config.type]);
		effect.setFloat('edgeSoftness', config.edgeSoftness);
		effect.setColor3('bgColor', new BABYLON.Color3(config.color.r, config.color.g, config.color.b));

		if (config.edgeColor) {
			effect.setColor3(
				'edgeColor',
				new BABYLON.Color3(config.edgeColor.r, config.edgeColor.g, config.edgeColor.b),
			);
			effect.setFloat('hasEdgeColor', 1);
		} else {
			effect.setColor3('edgeColor', new BABYLON.Color3(0, 0, 0));
			effect.setFloat('hasEdgeColor', 0);
		}

		effect.setFloat('useCustomMask', 0);
		effect.setFloat('reversed', config.reverse ? 1 : 0);

		// Type-specific uniforms
		effect.setFloat('direction', DIRECTION_MAP[config.direction] ?? 0);
		effect.setFloat('axis', AXIS_MAP[config.axis] ?? 0);
		effect.setFloat('openFromCenter', config.openFromCenter ? 1 : 0);
		effect.setFloat2('center', config.centerX, config.centerY);
		effect.setFloat('count', config.count);
		effect.setFloat('gridSize', config.gridSize);
		effect.setFloat('angle', (config.angle * Math.PI) / 180);
		effect.setFloat('clockwise', config.clockwise ? 1 : 0);
		effect.setFloat('bladeCount', config.bladeCount);
		effect.setFloat('noiseScale', config.noiseScale);
		effect.setFloat('noiseSeed', config.noiseSeed);
		effect.setFloat('matrixSize', config.matrixSize);
		effect.setFloat('lineWidth', config.lineWidth);
		effect.setFloat('maxBlockSize', config.maxBlockSize);
		effect.setFloat('hasScanlines', config.scanlines ? 1 : 0);
		effect.setFloat('swirlStrength', config.swirlStrength);
		effect.setFloat('swirlRadius', config.swirlRadius);
		effect.setFloat('zoomLineWidth', config.zoomLineWidth);
		effect.setFloat('cellCount', config.cellCount);
		effect.setFloat('amplitude', config.amplitude);
		effect.setFloat('frequency', config.frequency);
		effect.setFloat('waveCount', config.waveCount);
		effect.setFloat('glitchIntensity', config.glitchIntensity);
		effect.setFloat('pointCount', config.pointCount);
		effect.setFloat2('resolution', pp.width || 1, pp.height || 1);
	};

	// -------------------------------------------------------------------------
	// 4. Dispose handle (manual only — transition holds final state)
	// -------------------------------------------------------------------------
	let disposed = false;

	const dispose = (): void => {
		if (disposed) {
			return;
		}
		disposed = true;

		options.camera.detachPostProcess(pp);
		pp.dispose();
	};

	// -------------------------------------------------------------------------
	// 5. Deferred attachment for "Out" transitions — poll until the shader
	//    is compiled (isReady), then reattach. This prevents the black flash
	//    on the very first transition play when the shader needs to compile.
	//    "In" transitions are already attached (step 2) — no deferral needed.
	// -------------------------------------------------------------------------
	if (!config.reverse) {
		const observer: BABYLON.Observer<BABYLON.Scene> = options.scene.onBeforeRenderObservable.add(
			(): void => {
				if (disposed) {
					options.scene.onBeforeRenderObservable.remove(observer);
					return;
				}
				if (pp.isReady()) {
					options.scene.onBeforeRenderObservable.remove(observer);
					options.camera.attachPostProcess(pp);
				}
			},
		);
	}

	// -------------------------------------------------------------------------
	// 6. Return handle
	// -------------------------------------------------------------------------
	const handle: TransitionHandle = { dispose };
	return okShallow(handle);
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Fades the screen to black.
 *
 * Uses the `fade` transition type with black background color.
 *
 * @param options - Scene, camera, engine, and optional duration.
 * @returns BabylonResult containing a {@link TransitionHandle}.
 *
 * @example
 * ```typescript
 * import { fadeToBlack } from './transition-manager';
 *
 * const result = fadeToBlack({ scene, camera, engine, durationMs: 500 });
 * if (!result.ok) return result;
 * ```
 */
export function fadeToBlack(options: CommonTransitionOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		scene: options.scene,
		camera: options.camera,
		engine: options.engine,
		config: {
			type: 'fade',
			color: { r: 0, g: 0, b: 0 },
			durationMs: options.durationMs ?? 1000,
		},
	});
}

/**
 * Fades the screen to white.
 *
 * Uses the `fade` transition type with white background color.
 *
 * @param options - Scene, camera, engine, and optional duration.
 * @returns BabylonResult containing a {@link TransitionHandle}.
 *
 * @example
 * ```typescript
 * import { fadeToWhite } from './transition-manager';
 *
 * const result = fadeToWhite({ scene, camera, engine, durationMs: 500 });
 * if (!result.ok) return result;
 * ```
 */
export function fadeToWhite(options: CommonTransitionOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		scene: options.scene,
		camera: options.camera,
		engine: options.engine,
		config: {
			type: 'fade',
			color: { r: 1, g: 1, b: 1 },
			durationMs: options.durationMs ?? 1000,
		},
	});
}

/** Options for {@link fadeToColor}. */
type FadeToColorOptions = CommonTransitionOptions & {
	readonly color: Color3;
};

/**
 * Fades the screen to a custom color.
 *
 * Uses the `fade` transition type with the specified color.
 *
 * @param options - Scene, camera, engine, color, and optional duration.
 * @returns BabylonResult containing a {@link TransitionHandle}.
 *
 * @example
 * ```typescript
 * import { fadeToColor } from './transition-manager';
 *
 * const result = fadeToColor({
 *   scene, camera, engine,
 *   color: { r: 1, g: 0, b: 0 },
 *   durationMs: 800,
 * });
 * if (!result.ok) return result;
 * ```
 */
export function fadeToColor(options: FadeToColorOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		scene: options.scene,
		camera: options.camera,
		engine: options.engine,
		config: {
			type: 'fade',
			color: options.color,
			durationMs: options.durationMs ?? 1000,
		},
	});
}

/** Options for {@link screenFlash}. */
type ScreenFlashOptions = CommonTransitionOptions & {
	readonly color?: Color3;
};

/**
 * Triggers a brief screen flash effect.
 *
 * Uses the `fade` transition with white color, short duration (150ms),
 * `easeOut` easing, and reverse mode for a flash-then-clear effect.
 *
 * @param options - Scene, camera, engine, optional color and duration.
 * @returns BabylonResult containing a {@link TransitionHandle}.
 *
 * @example
 * ```typescript
 * import { screenFlash } from './transition-manager';
 *
 * const result = screenFlash({ scene, camera, engine });
 * if (!result.ok) return result;
 * ```
 */
export function screenFlash(options: ScreenFlashOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		scene: options.scene,
		camera: options.camera,
		engine: options.engine,
		config: {
			type: 'fade',
			color: options.color ?? { r: 1, g: 1, b: 1 },
			durationMs: options.durationMs ?? 150,
			easing: 'easeOut',
			reverse: true,
		},
	});
}

/** Options for {@link screenTint}. */
type ScreenTintOptions = CommonTransitionOptions & {
	readonly color: Color3;
};

/**
 * Applies a color tint to the screen using a fade transition.
 *
 * Uses the `fade` transition type with the specified tint color.
 *
 * @param options - Scene, camera, engine, tint color, and optional duration.
 * @returns BabylonResult containing a {@link TransitionHandle}.
 *
 * @example
 * ```typescript
 * import { screenTint } from './transition-manager';
 *
 * const result = screenTint({
 *   scene, camera, engine,
 *   color: { r: 0.8, g: 0, b: 0 },
 *   durationMs: 2000,
 * });
 * if (!result.ok) return result;
 * ```
 */
export function screenTint(options: ScreenTintOptions): BabylonResult<TransitionHandle> {
	return playTransition({
		scene: options.scene,
		camera: options.camera,
		engine: options.engine,
		config: {
			type: 'fade',
			color: options.color,
			durationMs: options.durationMs ?? 1000,
		},
	});
}

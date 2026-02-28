/**
 * Light animation — procedural flicker system.
 *
 * Seven flicker presets (candle, torch, campfire, pulse, strobe, breathing,
 * fluorescent) driven by per-frame `onBeforeRenderObservable`. Includes
 * optional color temperature shift and position jitter for realistic fire.
 *
 * All pure-math helpers are exported for unit testing without Babylon.js.
 *
 * @example
 * ```typescript
 * import { createFlicker, disposeFlicker } from './light-animation';
 *
 * const result = createFlicker({ scene, light, config: flickerConfig });
 * if (!result.ok) return result;
 * // Flicker animates automatically via scene observer
 * disposeFlicker({ flicker: result.data, scene });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { FlickerConfig } from '../schemas/lighting-config';
import type { ColorRgba, Vector3 } from '../schemas/color-schema';
import { colorTemperatureToRgb } from './color-temperature';

// =============================================================================
// Types
// =============================================================================

/** A light that has a position property (PointLight, SpotLight, DirectionalLight). */
type PositionedLight = BABYLON.Light & { position: BABYLON.Vector3 };

/**
 * Type guard for lights with a position property.
 *
 * @param light - The Babylon.js light to check.
 * @returns True if the light has a position property.
 */
function isPositionedLight(light: BABYLON.Light): light is PositionedLight {
	return 'position' in light;
}

/**
 * A running flicker animation instance.
 *
 * `config` is intentionally mutable — external code (dev harness, game
 * scripting) may write to it at runtime and the per-frame observer reads
 * the latest values each tick.
 */
export type FlickerInstance = {
	readonly observer: BABYLON.Observer<BABYLON.Scene>;
	readonly light: BABYLON.Light;
	readonly baseIntensity: Num;
	readonly basePosition: Vector3 | null;
	readonly baseDiffuse: ColorRgba;
	/** Mutable — external code may change values between frames. */
	config: Partial<FlickerConfig>;
};

// =============================================================================
// Pure Math — pseudoNoise
// =============================================================================

/**
 * Deterministic pseudo-random noise from a seed value.
 *
 * Uses the classic `fract(sin(seed * 12.9898 + 78.233) * 43758.5453)` hash.
 *
 * @param seed - Input seed value.
 * @returns Deterministic noise in `[0, 1)`.
 * @example
 * ```typescript
 * pseudoNoise(0);    // always returns same value
 * pseudoNoise(42.5); // deterministic for same seed
 * ```
 */
export function pseudoNoise(seed: Num): Num {
	const val: number = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
	return val - Math.floor(val);
}

// =============================================================================
// Pure Math — computeFlicker
// =============================================================================

/**
 * Computes flicker intensity multiplier for a given type and time.
 *
 * Returns a value in [1 - amplitude, 1]. Pure math — no Babylon.js dependency.
 *
 * @param type - Flicker type preset.
 * @param time - Elapsed time in seconds.
 * @param speed - Speed multiplier.
 * @param amplitude - Flicker amplitude [0, 1].
 * @returns Intensity multiplier in [1 - amplitude, 1].
 *
 * @example
 * ```typescript
 * const multiplier = computeFlicker('candle', elapsedSec, 1.0, 0.3);
 * light.intensity = baseIntensity * multiplier;
 * ```
 */
export function computeFlicker(type: string, time: Num, speed: Num, amplitude: Num): Num {
	if (amplitude === 0) return 1;

	const t: number = time;
	const s: number = speed;
	const a: number = amplitude;
	const PI2: number = Math.PI * 2;

	switch (type) {
		case 'candle': {
			const raw: number =
				0.5 * Math.sin(t * s * 12) + 0.3 * Math.sin(t * s * 23) + 0.2 * pseudoNoise(t * s * 50);
			return 1 - a * Math.max(0, Math.min(1, raw));
		}

		case 'torch': {
			const raw: number =
				0.4 * Math.sin(t * s * 8) + 0.3 * Math.sin(t * s * 17) + 0.3 * pseudoNoise(t * s * 35);
			return 1 - a * Math.max(0, Math.min(1, raw));
		}

		case 'campfire': {
			const raw: number =
				0.5 * Math.sin(t * s * 3) +
				0.25 * Math.sin(t * s * 7) +
				0.15 * Math.sin(t * s * 19) +
				0.1 * pseudoNoise(t * s * 30);
			return 1 - a * Math.max(0, Math.min(1, raw));
		}

		case 'pulse': {
			return 1 - a * (0.5 + 0.5 * Math.sin(t * s * PI2));
		}

		case 'strobe': {
			return Math.sin(t * s * 10) > 0 ? 1 : 1 - a;
		}

		case 'breathing': {
			return 1 - a * (0.5 + 0.5 * Math.sin(t * s * 0.5 * Math.PI));
		}

		case 'fluorescent': {
			return pseudoNoise(t * s * 20) < 0.05 ? 1 - a * 0.8 : 1;
		}

		default: {
			return 1;
		}
	}
}

// =============================================================================
// Pure Math — computeColorShift
// =============================================================================

/**
 * Computes shifted color temperature based on flicker multiplier.
 *
 * When dimmer (lower multiplier) → warmer (lower Kelvin).
 * When brighter (multiplier near 1) → base temperature.
 *
 * @param baseTemperature - Base color temperature in Kelvin.
 * @param flickerMultiplier - Current flicker multiplier [0, 1].
 * @param shiftRange - Kelvin range of color shift.
 * @returns Result containing the shifted RGBA color.
 *
 * @example
 * ```typescript
 * const color = computeColorShift(2700, 0.8, 200);
 * ```
 */
export function computeColorShift(
	baseTemperature: Num,
	flickerMultiplier: Num,
	shiftRange: Num,
): Result<ColorRgba> {
	const shiftedKelvin: number = baseTemperature - shiftRange * (1 - flickerMultiplier);
	const clampedKelvin: number = Math.max(1000, Math.min(15_000, shiftedKelvin));
	return colorTemperatureToRgb(clampedKelvin);
}

// =============================================================================
// Pure Math — computePositionJitter
// =============================================================================

/**
 * Computes jittered position from base + noise offset.
 *
 * Adds deterministic noise-based offset within the jitter radius.
 *
 * @param basePosition - Original light position.
 * @param jitterRadius - Maximum offset radius.
 * @param time - Elapsed time (used as noise seed).
 * @returns Jittered position.
 *
 * @example
 * ```typescript
 * const jittered = computePositionJitter({ x: 10, y: 5, z: 10 }, 0.5, elapsedSec);
 * ```
 */
export function computePositionJitter(
	basePosition: Vector3,
	jitterRadius: Num,
	time: Num,
): Vector3 {
	if (jitterRadius === 0) {
		return { x: basePosition.x, y: basePosition.y, z: basePosition.z };
	}

	// Map noise [0, 1) to [-1, 1)
	const nx: number = pseudoNoise(time * 7.3) * 2 - 1;
	const ny: number = pseudoNoise(time * 11.1) * 2 - 1;
	const nz: number = pseudoNoise(time * 13.7) * 2 - 1;

	return {
		x: basePosition.x + nx * jitterRadius,
		y: basePosition.y + ny * jitterRadius,
		z: basePosition.z + nz * jitterRadius,
	};
}

// =============================================================================
// Babylon.js Integration — createFlicker
// =============================================================================

/** Options for creating a flicker animation. */
type CreateFlickerOptions = {
	readonly scene: BABYLON.Scene;
	readonly light: BABYLON.Light;
	readonly config: Partial<FlickerConfig>;
	readonly colorTemperature?: Num;
};

/**
 * Creates a flicker animation on a light.
 *
 * Registers a per-frame observer on `scene.onBeforeRenderObservable`.
 *
 * @param options - Scene, light, flicker config, and optional color temperature.
 * @returns BabylonResult containing the flicker instance.
 *
 * @example
 * ```typescript
 * const result = createFlicker({ scene, light, config: flickerConfig });
 * ```
 */
export function createFlicker(options: CreateFlickerOptions): BabylonResult<FlickerInstance> {
	try {
		const { scene, light, config, colorTemperature } = options;
		const baseIntensity: number = light.intensity;
		const baseDiffuse: ColorRgba = {
			r: light.diffuse.r,
			g: light.diffuse.g,
			b: light.diffuse.b,
			a: 1,
		};

		// Store base position if light has one
		let basePosition: Vector3 | null = null;
		if ('position' in light && light.position instanceof BABYLON.Vector3) {
			basePosition = {
				x: light.position.x,
				y: light.position.y,
				z: light.position.z,
			};
		}

		let elapsedTime = 0;

		// Read config values each frame so external changes (dev harness sliders) take effect
		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			const dt: number = scene.getEngine().getDeltaTime() / 1000;
			elapsedTime += dt;

			const flickerType: string = config.type ?? 'candle';
			const flickerIntensity: number = config.intensity ?? 0.3;
			const flickerSpeed: number = config.speed ?? 1;
			const colorShiftEnabled: boolean = config.colorShift ?? false;
			const colorShiftRange: number = config.colorShiftRange ?? 200;
			const posJitter: number = config.positionJitter ?? 0;

			// Compute flicker multiplier
			const multiplier: number = computeFlicker(
				flickerType,
				elapsedTime,
				flickerSpeed,
				flickerIntensity,
			);
			light.intensity = baseIntensity * multiplier;

			// Color temperature shift
			if (colorShiftEnabled && colorTemperature !== undefined) {
				const shiftResult: Result<ColorRgba> = computeColorShift(
					colorTemperature,
					multiplier,
					colorShiftRange,
				);
				if (shiftResult.ok) {
					light.diffuse = new BABYLON.Color3(
						shiftResult.data.r,
						shiftResult.data.g,
						shiftResult.data.b,
					);
				}
			}

			// Position jitter
			if (posJitter > 0 && basePosition !== null && isPositionedLight(light)) {
				const jittered: Vector3 = computePositionJitter(basePosition, posJitter, elapsedTime);
				light.position = new BABYLON.Vector3(jittered.x, jittered.y, jittered.z);
			}
		});

		const flickerInstance: FlickerInstance = {
			observer,
			light,
			baseIntensity,
			basePosition,
			baseDiffuse,
			config,
		};

		return okShallow(flickerInstance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Babylon.js Integration — disposeFlicker
// =============================================================================

/** Options for disposing a flicker animation. */
type DisposeFlickerOptions = {
	readonly flicker: FlickerInstance;
	readonly scene: BABYLON.Scene;
};

/**
 * Disposes a flicker animation and restores base values.
 *
 * @param options - The flicker instance and scene.
 * @returns BabylonResult indicating success.
 */
export function disposeFlicker(options: DisposeFlickerOptions): BabylonResult<Bool> {
	try {
		const { flicker, scene } = options;

		// Remove observer
		scene.onBeforeRenderObservable.remove(flicker.observer);

		// Restore base values
		flicker.light.intensity = flicker.baseIntensity;
		flicker.light.diffuse = new BABYLON.Color3(
			flicker.baseDiffuse.r,
			flicker.baseDiffuse.g,
			flicker.baseDiffuse.b,
		);

		// Restore position if applicable
		if (flicker.basePosition !== null && isPositionedLight(flicker.light)) {
			flicker.light.position = new BABYLON.Vector3(
				flicker.basePosition.x,
				flicker.basePosition.y,
				flicker.basePosition.z,
			);
		}

		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Screen effects — full-screen overlay effects for RPG-style visual feedback.
 *
 * Provides four standard screen effects:
 * - `screenTint` — color overlay that fades in and out over a duration
 * - `screenFlash` — instant white/color flash that fades to transparent
 * - `screenFadeIn` — fade from opaque to transparent (scene appears)
 * - `screenFadeOut` — fade from transparent to opaque (scene disappears)
 *
 * All effects use a DOM overlay div positioned over the canvas. This approach
 * is more reliable than 3D plane meshes which have issues with billboard mode,
 * camera parenting, and rendering group conflicts.
 *
 * Each returns a `ScreenEffectHandle` with `dispose()` for early cancellation.
 *
 * @example
 * ```typescript
 * import { screenFlash, screenFadeOut } from './screen-effects';
 *
 * // White flash
 * const flash = screenFlash({
 *   scene, color: { r: 1, g: 1, b: 1, a: 1 }, durationMs: 200,
 * });
 *
 * // Fade to black
 * const fade = screenFadeOut({
 *   scene, color: { r: 0, g: 0, b: 0, a: 1 }, durationMs: 500,
 * });
 * if (fade.ok) fade.data.dispose(); // early cancel
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { ColorRgba } from '../schemas/scene-setup-config';

// =============================================================================
// Types
// =============================================================================

/**
 * Handle for an active screen effect.
 *
 * Call `dispose()` to cancel the effect early and remove the overlay.
 */
export type ScreenEffectHandle = {
	/** Disposes the overlay and per-frame observer. */
	readonly dispose: () => void;
};

/** Common options for all screen effects. */
type ScreenEffectOptions = {
	/** The Babylon.js scene. */
	readonly scene: BABYLON.Scene;
	/** Overlay color (alpha controls initial/target opacity). */
	readonly color: ColorRgba;
	/** Effect duration in milliseconds. */
	readonly durationMs: Num;
};

// =============================================================================
// Internal: Create DOM overlay
// =============================================================================

/**
 * Creates a full-screen DOM overlay element positioned over the canvas.
 *
 * @param scene - The Babylon.js scene (used to find the canvas).
 * @param color - Overlay RGBA color.
 * @param initialOpacity - Starting CSS opacity (0-1).
 * @returns The overlay div element.
 */
function createOverlayDiv(scene: BABYLON.Scene, color: ColorRgba, initialOpacity: Num): HTMLDivElement {
	const overlay = document.createElement('div');
	const canvas = scene.getEngine().getRenderingCanvas();

	// Match canvas position
	overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;';
	overlay.style.backgroundColor = `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
	overlay.style.opacity = String(initialOpacity);

	// Insert before the control panel so it covers the canvas but not the UI
	const parent = canvas?.parentElement ?? document.body;
	parent.append(overlay);

	return overlay;
}

/**
 * Creates a disposable effect handle that cleans up the DOM overlay + observer.
 *
 * @param scene - The Babylon.js scene.
 * @param overlay - The DOM overlay element.
 * @param observer - The per-frame observer (null if not registered).
 * @returns ScreenEffectHandle with a dispose function.
 */
function createEffectHandle(
	scene: BABYLON.Scene,
	overlay: HTMLDivElement,
	observer: BABYLON.Observer<BABYLON.Scene> | null,
): ScreenEffectHandle {
	let disposed = false;

	return {
		dispose: () => {
			if (disposed) return;
			disposed = true;
			if (observer) {
				scene.onBeforeRenderObservable.remove(observer);
			}
			overlay.remove();
		},
	};
}

// =============================================================================
// screenTint
// =============================================================================

/**
 * Applies a color tint overlay that fades in, holds, then fades out.
 *
 * @param options - Scene, tint color, and total duration.
 * @returns BabylonResult containing the effect handle.
 *
 * @example
 * ```typescript
 * const result = screenTint({
 *   scene, color: { r: 1, g: 0, b: 0, a: 0.5 }, durationMs: 1000,
 * });
 * ```
 */
export function screenTint(options: ScreenEffectOptions): BabylonResult<ScreenEffectHandle> {
	const { scene, color, durationMs } = options;

	try {
		const targetAlpha: Num = color.a as Num;
		const overlay = createOverlayDiv(scene, color, 0 as Num);

		const startTime: Num = Date.now() as Num;
		const fadeInMs: Num = (durationMs * 0.2) as Num;
		const fadeOutMs: Num = (durationMs * 0.2) as Num;
		const holdMs: Num = (durationMs - fadeInMs - fadeOutMs) as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;

			if (elapsed < fadeInMs) {
				overlay.style.opacity = String(targetAlpha * (elapsed / fadeInMs));
			} else if (elapsed < fadeInMs + holdMs) {
				overlay.style.opacity = String(targetAlpha);
			} else if (elapsed < durationMs) {
				const fadeOutElapsed: Num = (elapsed - fadeInMs - holdMs) as Num;
				overlay.style.opacity = String(targetAlpha * (1 - fadeOutElapsed / fadeOutMs));
			} else {
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, overlay, observer);
		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// screenFlash
// =============================================================================

/**
 * Creates an instant color flash that decays to transparent.
 *
 * @param options - Scene, flash color, and decay duration.
 * @returns BabylonResult containing the effect handle.
 *
 * @example
 * ```typescript
 * const result = screenFlash({
 *   scene, color: { r: 1, g: 1, b: 1, a: 1 }, durationMs: 200,
 * });
 * ```
 */
export function screenFlash(options: ScreenEffectOptions): BabylonResult<ScreenEffectHandle> {
	const { scene, color, durationMs } = options;

	try {
		const overlay = createOverlayDiv(scene, color, color.a as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			overlay.style.opacity = String(color.a * (1 - progress));

			if (progress >= 1) {
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, overlay, observer);
		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// screenFadeIn
// =============================================================================

/**
 * Fades the screen from opaque overlay to transparent (scene appears).
 *
 * @param options - Scene, overlay color, and fade duration.
 * @returns BabylonResult containing the effect handle.
 *
 * @example
 * ```typescript
 * const result = screenFadeIn({
 *   scene, color: { r: 0, g: 0, b: 0, a: 1 }, durationMs: 500,
 * });
 * ```
 */
export function screenFadeIn(options: ScreenEffectOptions): BabylonResult<ScreenEffectHandle> {
	const { scene, color, durationMs } = options;

	try {
		const overlay = createOverlayDiv(scene, color, color.a as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			// Fade from opaque to transparent
			overlay.style.opacity = String(color.a * (1 - progress));

			if (progress >= 1) {
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, overlay, observer);
		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// screenFadeOut
// =============================================================================

/**
 * Fades the screen from transparent to opaque overlay (scene disappears).
 *
 * @param options - Scene, overlay color, and fade duration.
 * @returns BabylonResult containing the effect handle.
 *
 * @example
 * ```typescript
 * const result = screenFadeOut({
 *   scene, color: { r: 0, g: 0, b: 0, a: 1 }, durationMs: 500,
 * });
 * ```
 */
export function screenFadeOut(options: ScreenEffectOptions): BabylonResult<ScreenEffectHandle> {
	const { scene, color, durationMs } = options;

	try {
		const overlay = createOverlayDiv(scene, color, 0 as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			// Fade from transparent to opaque
			overlay.style.opacity = String(color.a * progress);

			if (progress >= 1) {
				// Keep overlay visible, just remove observer
				scene.onBeforeRenderObservable.remove(observer);
			}
		});

		const handle = createEffectHandle(scene, overlay, observer);
		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

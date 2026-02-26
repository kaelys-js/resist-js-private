/**
 * Screen effects — full-screen overlay effects for RPG-style visual feedback.
 *
 * Provides four standard screen effects:
 * - `screenTint` — color overlay that fades in and out over a duration
 * - `screenFlash` — instant white/color flash that fades to transparent
 * - `screenFadeIn` — fade from opaque to transparent (scene appears)
 * - `screenFadeOut` — fade from transparent to opaque (scene disappears)
 *
 * All effects use a full-screen plane mesh parented to the camera with
 * per-frame alpha animation via `scene.onBeforeRenderObservable`.
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
	/** Disposes the overlay mesh, material, and per-frame observer. */
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
// Internal: Create overlay plane
// =============================================================================

/**
 * Creates a full-screen overlay plane in front of the camera.
 *
 * @param scene - The Babylon.js scene.
 * @param name - Mesh name for identification.
 * @param color - Overlay RGBA color.
 * @param initialAlpha - Starting alpha transparency.
 * @returns The plane mesh and StandardMaterial for alpha control.
 */
function createOverlayPlane(
	scene: BABYLON.Scene,
	name: string,
	color: ColorRgba,
	initialAlpha: Num,
): { mesh: BABYLON.Mesh; material: BABYLON.StandardMaterial } {
	const mesh = BABYLON.MeshBuilder.CreatePlane(name, { size: 100 }, scene);
	mesh.renderingGroupId = 3;
	mesh.isPickable = false;
	mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

	// Position close to camera
	const camera = scene.activeCamera;
	if (camera) {
		mesh.parent = camera;
		mesh.position = new BABYLON.Vector3(0, 0, 1);
	}

	const material = new BABYLON.StandardMaterial(`${name}-mat`, scene);
	material.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
	material.emissiveColor = new BABYLON.Color3(color.r, color.g, color.b);
	material.disableLighting = true;
	material.backFaceCulling = false;
	material.alpha = initialAlpha;
	mesh.material = material;

	return { mesh, material };
}

/**
 * Creates a disposable effect handle that cleans up mesh + observer.
 *
 * @param scene - The Babylon.js scene.
 * @param mesh - The overlay plane mesh.
 * @param material - The overlay material.
 * @param observer - The per-frame observer (null if not registered).
 * @returns ScreenEffectHandle with a dispose function.
 */
function createEffectHandle(
	scene: BABYLON.Scene,
	mesh: BABYLON.Mesh,
	material: BABYLON.StandardMaterial,
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
			material.dispose();
			mesh.dispose();
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
		const { mesh, material } = createOverlayPlane(scene, 'screen-tint', color, 0 as Num);

		const startTime: Num = Date.now() as Num;
		const fadeInMs: Num = (durationMs * 0.2) as Num;
		const fadeOutMs: Num = (durationMs * 0.2) as Num;
		const holdMs: Num = (durationMs - fadeInMs - fadeOutMs) as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;

			if (elapsed < fadeInMs) {
				// Fade in
				material.alpha = targetAlpha * (elapsed / fadeInMs);
			} else if (elapsed < fadeInMs + holdMs) {
				// Hold
				material.alpha = targetAlpha;
			} else if (elapsed < durationMs) {
				// Fade out
				const fadeOutElapsed: Num = (elapsed - fadeInMs - holdMs) as Num;
				material.alpha = targetAlpha * (1 - fadeOutElapsed / fadeOutMs);
			} else {
				// Done — auto-dispose
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, mesh, material, observer);
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
		const { mesh, material } = createOverlayPlane(scene, 'screen-flash', color, color.a as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			material.alpha = color.a * (1 - progress);

			if (progress >= 1) {
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, mesh, material, observer);
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
		const { mesh, material } = createOverlayPlane(scene, 'screen-fade-in', color, color.a as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			// Fade from opaque to transparent
			material.alpha = color.a * (1 - progress);

			if (progress >= 1) {
				handle.dispose();
			}
		});

		const handle = createEffectHandle(scene, mesh, material, observer);
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
		const { mesh, material } = createOverlayPlane(scene, 'screen-fade-out', color, 0 as Num);

		const startTime: Num = Date.now() as Num;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const elapsed: Num = (Date.now() - startTime) as Num;
			const progress: Num = Math.min(1, elapsed / durationMs) as Num;

			// Fade from transparent to opaque
			material.alpha = color.a * progress;

			if (progress >= 1 && observer) {
				// Keep overlay visible (don't dispose — it stays opaque)
				// Only remove the observer
				scene.onBeforeRenderObservable.remove(observer);
			}
		});

		const handle = createEffectHandle(scene, mesh, material, observer);
		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

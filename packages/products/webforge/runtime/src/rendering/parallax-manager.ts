/**
 * Parallax scrolling background manager.
 *
 * Uses Babylon.js `Layer` to create 2D screen-space background images
 * that scroll at a fraction of the camera movement speed, creating a
 * depth parallax effect. Each layer is rendered behind all 3D scene
 * geometry as a fullscreen quad.
 *
 * @example
 * ```typescript
 * import { createParallax, disposeParallax } from './parallax-manager';
 *
 * const result = createParallax({
 *   scene, layers: skyConfig.parallaxLayers, assetBasePath: '/assets/',
 * });
 * if (result.ok) {
 *   // parallax backgrounds are live in the scene
 *   disposeParallax({ parallax: result.data });
 * }
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Bool, Num } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { ColorRgba } from '../schemas/scene-setup-config';
import type { ParallaxLayer } from '../schemas/sky-config';

// =============================================================================
// ParallaxInstance
// =============================================================================

/**
 * A live parallax background instance in the scene.
 *
 * `layers` is intentionally mutable — external code (dev harness)
 * may write to layer configs at runtime and the per-frame observer
 * reads the latest values each tick.
 */
export type ParallaxInstance = {
	/** Background layers (one per parallax config, ordered back-to-front). */
	readonly bgLayers: BABYLON.Layer[];
	/** Mutable — external code may change scroll speeds between frames. */
	layers: ParallaxLayer[];
	/** Accumulated auto-scroll UV offsets per layer (u, v pairs). */
	readonly autoScrollAccum: Array<{ u: Num; v: Num }>;
	/** Per-frame observer for UV offset updates (null if no layers). */
	readonly observer: BABYLON.Observer<BABYLON.Scene> | null;
	/** The scene this parallax belongs to. */
	readonly scene: BABYLON.Scene;
};

// =============================================================================
// Blend mode mapping
// =============================================================================

/**
 * Maps a parallax layer blend mode string to the corresponding
 * Babylon.js alpha blending constant.
 *
 * | Mode | Babylon constant | Value |
 * |------|-----------------|-------|
 * | `'alpha'` | `ALPHA_COMBINE` | 2 |
 * | `'additive'` | `ALPHA_ADD` | 1 |
 * | `'multiply'` | `ALPHA_MULTIPLY` | 4 |
 * | `'subtract'` | `ALPHA_SUBTRACT` | 3 |
 * | `'screen'` | `ALPHA_SCREENMODE` | 10 |
 *
 * Unknown modes default to `'alpha'` (2).
 *
 * @param mode - The blend mode string from the parallax layer config.
 * @returns The numeric Babylon.js alpha blending constant.
 *
 * @example
 * ```typescript
 * mapBlendMode('additive'); // 1
 * mapBlendMode('screen');   // 10
 * mapBlendMode('unknown');  // 2 (default: alpha)
 * ```
 */
export function mapBlendMode(mode: string): Num {
	switch (mode) {
		case 'alpha': {
			return 2 as Num;
		}
		case 'additive': {
			return 1 as Num;
		}
		case 'multiply': {
			return 4 as Num;
		}
		case 'subtract': {
			return 3 as Num;
		}
		case 'screen': {
			return 10 as Num;
		}
		default: {
			return 2 as Num;
		}
	}
}

// =============================================================================
// Parallax offset computation (pure math, exported for testing)
// =============================================================================

/**
 * Computes the UV offset for a parallax layer based on camera position.
 *
 * @param options - Camera position and scroll speeds.
 * @returns The { x, y } UV offset values.
 *
 * @example
 * ```typescript
 * const offset = computeParallaxOffset({
 *   cameraX: 10, cameraZ: 5, scrollSpeedX: 0.5, scrollSpeedY: 0.3,
 * });
 * // offset.x = 5, offset.y = 1.5
 * ```
 */
export function computeParallaxOffset(options: {
	readonly cameraX: Num;
	readonly cameraZ: Num;
	readonly scrollSpeedX: Num;
	readonly scrollSpeedY: Num;
}): { readonly x: Num; readonly y: Num } {
	return {
		x: (options.cameraX * options.scrollSpeedX) as Num,
		y: (options.cameraZ * options.scrollSpeedY) as Num,
	};
}

// =============================================================================
// createParallax
// =============================================================================

/**
 * Creates parallax scrolling background layers in the scene.
 *
 * Uses Babylon.js `Layer` (2D screen-space background) which renders
 * behind all 3D geometry. UV offset is updated per frame based on
 * camera position to create the parallax scrolling effect.
 *
 * @param options - Scene, layer configs, and asset base path.
 * @returns BabylonResult containing the parallax instance handle.
 *
 * @example
 * ```typescript
 * const result = createParallax({
 *   scene, layers: skyConfig.parallaxLayers, assetBasePath: '/assets/',
 * });
 * ```
 */
export function createParallax(options: {
	readonly scene: BABYLON.Scene;
	readonly layers: readonly ParallaxLayer[];
	readonly assetBasePath: string;
}): BabylonResult<ParallaxInstance> {
	const { scene, assetBasePath } = options;

	try {
		// Sort layers by depth (lower depth = further back, rendered first)
		const sortedLayers: ParallaxLayer[] = [...options.layers].toSorted((a, b) => a.depth - b.depth);

		const bgLayers: BABYLON.Layer[] = [];

		for (let i = 0; i < sortedLayers.length; i++) {
			const layer = sortedLayers[i];
			if (!layer) continue;

			const texturePath = `${assetBasePath}${layer.imagePath}`;

			// Layer(name, imgUrl, scene, isBackground)
			// isBackground=true renders behind 3D, isBackground=false renders in front
			const isBackground = layer.layerType !== 'foreground';
			const bgLayer = new BABYLON.Layer(`parallax-${i}`, texturePath, scene, isBackground);

			// Apply blend mode from layer config
			bgLayer.alphaBlendingMode = mapBlendMode(layer.blendMode);

			// Apply tint color with opacity in the alpha channel
			bgLayer.color = new BABYLON.Color4(layer.tint.r, layer.tint.g, layer.tint.b, layer.opacity);

			// Configure texture tiling — Layer.texture is BaseTexture but the
			// constructor creates a Texture, so we narrow for UV property access.
			const tex = bgLayer.texture;
			if (tex && tex instanceof BABYLON.Texture) {
				if (layer.tileX) {
					tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
				} else {
					tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
				}
				if (layer.tileY) {
					tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
				} else {
					tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
				}

				// Apply scale via texture scaling
				tex.uScale = 1 / layer.scale;
				tex.vScale = 1 / layer.scale;
			}

			// Apply layer scale to offset positioning
			bgLayer.scale = new BABYLON.Vector2(layer.scale, layer.scale);
			bgLayer.offset = new BABYLON.Vector2(0, layer.offsetY * 0.01);

			bgLayers.push(bgLayer);
		}

		// Accumulated auto-scroll offsets (one per sorted layer)
		const autoScrollAccum: Array<{ u: Num; v: Num }> = sortedLayers.map(() => ({
			u: 0 as Num,
			v: 0 as Num,
		}));

		// Register per-frame observer for UV offset and auto-scroll updates
		let observer: BABYLON.Observer<BABYLON.Scene> | null = null;
		if (sortedLayers.length > 0) {
			observer = scene.onBeforeRenderObservable.add(() => {
				const dt = (scene.getEngine().getDeltaTime() / 1000) as Num;
				const camera = scene.activeCamera;

				for (let i = 0; i < sortedLayers.length; i++) {
					const layer = sortedLayers[i];
					if (!layer) continue;
					const bgLayer = bgLayers[i];
					if (!bgLayer?.texture || !(bgLayer.texture instanceof BABYLON.Texture)) continue;

					// Camera-based parallax offset (absolute, position-based)
					let cameraU = 0 as Num;
					let cameraV = 0 as Num;
					if (camera) {
						const cameraPos = camera.position;
						const offset = computeParallaxOffset({
							cameraX: cameraPos.x as Num,
							cameraZ: cameraPos.z as Num,
							scrollSpeedX: layer.scrollSpeedX as Num,
							scrollSpeedY: layer.scrollSpeedY as Num,
						});
						cameraU = (offset.x * 0.01) as Num;
						cameraV = (offset.y * 0.01) as Num;
					}

					// Accumulate auto-scroll drift (camera-independent, time-based)
					const accum = autoScrollAccum[i];
					if (accum) {
						accum.u = (accum.u + layer.autoScrollX * dt) as Num;
						accum.v = (accum.v + layer.autoScrollY * dt) as Num;
					}

					// Combine absolute camera offset with accumulated auto-scroll
					bgLayer.texture.uOffset = cameraU + (accum ? accum.u : 0);
					bgLayer.texture.vOffset = cameraV + (accum ? accum.v : 0);
				}
			});
		}

		return okShallow({
			bgLayers,
			layers: sortedLayers,
			autoScrollAccum,
			observer,
			scene,
		});
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// disposeParallax
// =============================================================================

/**
 * Disposes all parallax resources (layers, textures, observer).
 *
 * @param options - The parallax instance to dispose.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * disposeParallax({ parallax: parallaxInstance });
 * ```
 */
export function disposeParallax(options: {
	readonly parallax: ParallaxInstance;
}): BabylonResult<Bool> {
	const { parallax } = options;

	try {
		// Remove per-frame observer
		if (parallax.observer) {
			parallax.scene.onBeforeRenderObservable.remove(parallax.observer);
		}

		// Dispose background layers (also disposes internal textures)
		for (const bgLayer of parallax.bgLayers) {
			bgLayer.dispose();
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// getParallaxLayerCount
// =============================================================================

/**
 * Returns the number of parallax layers in the instance.
 *
 * @param options - The parallax instance to query.
 * @returns BabylonResult containing the layer count.
 *
 * @example
 * ```typescript
 * const countResult = getParallaxLayerCount({ parallax });
 * if (countResult.ok) console.log('Layers:', countResult.data);
 * ```
 */
export function getParallaxLayerCount(options: {
	readonly parallax: ParallaxInstance;
}): BabylonResult<Num> {
	return okShallow(options.parallax.bgLayers.length as Num);
}

// =============================================================================
// addParallaxLayer
// =============================================================================

/**
 * Adds a new parallax layer to a live parallax instance at runtime.
 *
 * Creates a new Babylon.js `Layer`, applies blend mode, tint, tiling,
 * scale, and offset from the layer config, then pushes to bgLayers,
 * layers, and autoScrollAccum arrays.
 *
 * @param options - Parallax instance, layer config, and asset base path.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * const addResult = addParallaxLayer({
 *   parallax, layer: { imagePath: 'bg/new.png', scrollSpeedX: 0.5, ... },
 *   assetBasePath: '/assets/',
 * });
 * if (!addResult.ok) return addResult;
 * ```
 */
export function addParallaxLayer(options: {
	readonly parallax: ParallaxInstance;
	readonly layer: ParallaxLayer;
	readonly assetBasePath: string;
}): BabylonResult<Bool> {
	const { parallax, layer, assetBasePath } = options;

	try {
		const texturePath = `${assetBasePath}${layer.imagePath}`;
		const index: Num = parallax.bgLayers.length as Num;
		const isBackground: boolean = layer.layerType !== 'foreground';
		const bgLayer = new BABYLON.Layer(
			`parallax-${index}`,
			texturePath,
			parallax.scene,
			isBackground,
		);

		// Apply blend mode
		bgLayer.alphaBlendingMode = mapBlendMode(layer.blendMode);

		// Apply tint with opacity
		bgLayer.color = new BABYLON.Color4(layer.tint.r, layer.tint.g, layer.tint.b, layer.opacity);

		// Configure texture tiling and scale
		const tex = bgLayer.texture;
		if (tex && tex instanceof BABYLON.Texture) {
			if (layer.tileX) {
				tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
			} else {
				tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
			}
			if (layer.tileY) {
				tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
			} else {
				tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
			}
			tex.uScale = 1 / layer.scale;
			tex.vScale = 1 / layer.scale;
		}

		bgLayer.scale = new BABYLON.Vector2(layer.scale, layer.scale);
		bgLayer.offset = new BABYLON.Vector2(0, layer.offsetY * 0.01);

		parallax.bgLayers.push(bgLayer);
		parallax.layers.push(layer);
		parallax.autoScrollAccum.push({ u: 0 as Num, v: 0 as Num });

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// removeParallaxLayer
// =============================================================================

/**
 * Removes a parallax layer by index from a live parallax instance.
 *
 * Disposes the Babylon.js `Layer` and splices the corresponding
 * entries from bgLayers, layers, and autoScrollAccum arrays.
 *
 * @param options - Parallax instance and the index to remove.
 * @returns BabylonResult indicating success, or error if index is out of bounds.
 *
 * @example
 * ```typescript
 * const removeResult = removeParallaxLayer({ parallax, index: 0 });
 * if (!removeResult.ok) return removeResult;
 * ```
 */
export function removeParallaxLayer(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
}): BabylonResult<Bool> {
	const { parallax, index } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(
			ERRORS.VALIDATION.INVALID_FORMAT,
			`Layer index ${index} out of bounds (0..${parallax.bgLayers.length - 1})`,
		);
	}

	try {
		const bgLayer = parallax.bgLayers[index];
		if (bgLayer) {
			bgLayer.dispose();
		}

		parallax.bgLayers.splice(index, 1);
		parallax.layers.splice(index, 1);
		parallax.autoScrollAccum.splice(index, 1);

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// setParallaxLayerTint
// =============================================================================

/**
 * Updates the tint color of a parallax layer at the given index.
 *
 * Sets both the Babylon.js `Layer.color` (RGB channels) and the
 * config `layer.tint`, preserving the current opacity in the alpha channel.
 *
 * @param options - Parallax instance, layer index, and new tint color.
 * @returns BabylonResult indicating success, or error if index is out of bounds.
 *
 * @example
 * ```typescript
 * const tintResult = setParallaxLayerTint({
 *   parallax, index: 0, tint: { r: 1, g: 0, b: 0, a: 1 },
 * });
 * if (!tintResult.ok) return tintResult;
 * ```
 */
export function setParallaxLayerTint(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
	readonly tint: ColorRgba;
}): BabylonResult<Bool> {
	const { parallax, index, tint } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(
			ERRORS.VALIDATION.INVALID_FORMAT,
			`Layer index ${index} out of bounds (0..${parallax.bgLayers.length - 1})`,
		);
	}

	try {
		const bgLayer = parallax.bgLayers[index];
		const layer = parallax.layers[index];
		if (bgLayer && layer) {
			bgLayer.color = new BABYLON.Color4(tint.r, tint.g, tint.b, bgLayer.color.a);
			layer.tint = tint;
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// fadeLayerOpacity
// =============================================================================

/**
 * Fades a parallax layer's opacity from its current value to a target
 * over the specified duration in milliseconds.
 *
 * Registers a per-frame observer that linearly interpolates the opacity.
 * Returns a handle with a `dispose` method to cancel the fade early.
 * The observer auto-removes when the fade completes (t >= 1).
 *
 * @param options - Parallax instance, layer index, target opacity, and duration.
 * @returns BabylonResult containing a dispose handle, or error if index is out of bounds.
 *
 * @example
 * ```typescript
 * const fadeResult = fadeLayerOpacity({
 *   parallax, index: 0, target: 0, durationMs: 1000,
 * });
 * if (fadeResult.ok) {
 *   // Cancel the fade early if needed:
 *   fadeResult.data.dispose();
 * }
 * ```
 */
export function fadeLayerOpacity(options: {
	readonly parallax: ParallaxInstance;
	readonly index: Num;
	readonly target: Num;
	readonly durationMs: Num;
}): BabylonResult<{ readonly dispose: () => void }> {
	const { parallax, index, target, durationMs } = options;

	if (index < 0 || index >= parallax.bgLayers.length) {
		return err(
			ERRORS.VALIDATION.INVALID_FORMAT,
			`Layer index ${index} out of bounds (0..${parallax.bgLayers.length - 1})`,
		);
	}

	try {
		const bgLayer = parallax.bgLayers[index];
		const layer = parallax.layers[index];
		if (!bgLayer || !layer) {
			return err(ERRORS.VALIDATION.INVALID_FORMAT, `Layer at index ${index} not found`);
		}

		const startOpacity: Num = bgLayer.color.a as Num;
		let elapsed = 0 as Num;

		const observer = parallax.scene.onBeforeRenderObservable.add(() => {
			const dtMs: Num = parallax.scene.getEngine().getDeltaTime() as Num;
			elapsed = (elapsed + dtMs) as Num;
			const t: Num = Math.min(elapsed / durationMs, 1) as Num;

			const currentOpacity: Num = (startOpacity + (target - startOpacity) * t) as Num;

			// Update bgLayer color with current tint and interpolated opacity
			bgLayer.color = new BABYLON.Color4(layer.tint.r, layer.tint.g, layer.tint.b, currentOpacity);
			layer.opacity = currentOpacity;

			if (t >= 1 && observer) {
				parallax.scene.onBeforeRenderObservable.remove(observer);
			}
		});

		const dispose = (): void => {
			if (observer) {
				parallax.scene.onBeforeRenderObservable.remove(observer);
			}
		};

		return okShallow({ dispose });
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

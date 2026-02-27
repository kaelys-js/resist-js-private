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

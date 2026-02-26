/**
 * Parallax scrolling background manager.
 *
 * Creates textured planes behind the tilemap that scroll at a fraction
 * of the camera movement speed, creating a depth parallax effect.
 * Each layer is a `MeshBuilder.CreatePlane` with UV offset updated
 * per frame via `scene.onBeforeRenderObservable`.
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
 * Contains plane meshes, materials, and the per-frame observer.
 */
export type ParallaxInstance = {
	/** Plane meshes (one per layer, ordered back-to-front). */
	readonly planes: BABYLON.Mesh[];
	/** Materials (one per layer). */
	readonly materials: BABYLON.StandardMaterial[];
	/** Layer configurations for per-frame offset computation. */
	readonly layers: readonly ParallaxLayer[];
	/** Per-frame observer for UV offset updates (null if no layers). */
	readonly observer: BABYLON.Observer<BABYLON.Scene> | null;
	/** The scene this parallax belongs to. */
	readonly scene: BABYLON.Scene;
};

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
 * Creates parallax scrolling background planes in the scene.
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
	const { scene, layers, assetBasePath } = options;

	try {
		const planes: BABYLON.Mesh[] = [];
		const materials: BABYLON.StandardMaterial[] = [];

		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			if (!layer) continue;

			// Create plane mesh positioned behind the tilemap
			// Each successive layer is slightly closer to camera (less negative Z)
			const planeSize: Num = 500 as Num;
			const plane = BABYLON.MeshBuilder.CreatePlane(
				`parallax-${i}`,
				{
					width: planeSize * layer.scale,
					height: planeSize * layer.scale,
				},
				scene,
			);

			// Position behind tilemap, offset by layer index for back-to-front order
			plane.position.y = layer.offsetY;
			plane.position.z = -100 + i * 2;
			plane.renderingGroupId = 0;
			plane.visibility = layer.opacity;

			// Create material with texture
			const material = new BABYLON.StandardMaterial(`parallax-mat-${i}`, scene);
			const texturePath = `${assetBasePath}${layer.imagePath}`;
			const texture = new BABYLON.Texture(texturePath, scene);

			// Configure tiling
			if (layer.tileX) {
				texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
			} else {
				texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
			}
			if (layer.tileY) {
				texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
			} else {
				texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
			}

			material.diffuseTexture = texture;
			material.emissiveColor = new BABYLON.Color3(1, 1, 1);
			material.disableLighting = true;
			material.backFaceCulling = false;
			plane.material = material;

			planes.push(plane);
			materials.push(material);
		}

		// Register per-frame observer for UV offset updates
		let observer: BABYLON.Observer<BABYLON.Scene> | null = null;
		if (layers.length > 0) {
			observer = scene.onBeforeRenderObservable.add(() => {
				const camera = scene.activeCamera;
				if (!camera) return;

				const cameraPos = camera.position;
				for (let i = 0; i < layers.length; i++) {
					const layer = layers[i];
					if (!layer) continue;
					const material = materials[i];
					if (!material) continue;

					const tex = material.diffuseTexture;
					if (!tex || !(tex instanceof BABYLON.Texture)) continue;

					const offset = computeParallaxOffset({
						cameraX: cameraPos.x as Num,
						cameraZ: cameraPos.z as Num,
						scrollSpeedX: layer.scrollSpeedX as Num,
						scrollSpeedY: layer.scrollSpeedY as Num,
					});

					tex.uOffset = offset.x;
					tex.vOffset = offset.y;
				}
			});
		}

		return okShallow({
			planes,
			materials,
			layers,
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
 * Disposes all parallax resources (meshes, materials, observer).
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

		// Dispose materials (also disposes textures)
		for (const material of parallax.materials) {
			if (material.diffuseTexture) {
				material.diffuseTexture.dispose();
			}
			material.dispose();
		}

		// Dispose plane meshes
		for (const plane of parallax.planes) {
			plane.dispose();
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * HDR environment (image-based lighting) loader and disposal.
 *
 * Loads an HDR cubemap texture for indirect lighting and reflections.
 * No visible skybox is created — IBL only, per design decision.
 *
 * @example
 * ```typescript
 * import { loadHdrEnvironment, disposeHdrEnvironment } from './hdr-environment';
 *
 * const result = loadHdrEnvironment({ scene, config: hdrConfig });
 * if (!result.ok) return result;
 *
 * // Later:
 * disposeHdrEnvironment({ instance: result.data });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import type { HdrEnvironmentConfig } from '../schemas/post-processing-config';
import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Types
// =============================================================================

/** HDR environment instance returned by {@link loadHdrEnvironment}. */
export type HdrEnvironmentInstance = {
	readonly texture: BABYLON.BaseTexture & { rotationY: number };
	readonly scene: BABYLON.Scene;
};

/** Options for {@link loadHdrEnvironment}. */
type LoadHdrOptions = {
	readonly scene: BABYLON.Scene;
	readonly config: HdrEnvironmentConfig;
};

/** Options for {@link applyHdrEnvironmentToScene}. */
type ApplyHdrOptions = {
	readonly scene: BABYLON.Scene;
	readonly texture: BABYLON.BaseTexture & { rotationY: number };
	readonly intensity: Num;
	readonly rotationY: Num;
};

/** Options for {@link disposeHdrEnvironment}. */
type DisposeHdrOptions = {
	readonly instance: HdrEnvironmentInstance;
};

// =============================================================================
// Apply (testable scene property setup)
// =============================================================================

/**
 * Applies an existing texture as the scene's HDR environment.
 *
 * Sets `scene.environmentTexture`, `scene.environmentIntensity`,
 * and `texture.rotationY`. This function is separate from loading
 * to allow testing with stand-in textures in NullEngine.
 *
 * @param options - Scene, texture, intensity, and rotation.
 * @returns BabylonResult containing the HDR environment instance.
 *
 * @example
 * ```typescript
 * const result = applyHdrEnvironmentToScene({
 *   scene,
 *   texture: cubeTexture,
 *   intensity: 1.5,
 *   rotationY: 0,
 * });
 * ```
 */
export function applyHdrEnvironmentToScene(
	options: ApplyHdrOptions,
): BabylonResult<HdrEnvironmentInstance> {
	try {
		const { scene, texture, intensity, rotationY } = options;

		texture.rotationY = rotationY;
		scene.environmentTexture = texture;
		scene.environmentIntensity = intensity;

		const instance: HdrEnvironmentInstance = { texture, scene };
		return okShallow(instance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Load
// =============================================================================

/**
 * Loads an HDR cubemap texture for image-based lighting.
 *
 * Creates an `HDRCubeTexture` from the config path, then applies it
 * to the scene via {@link applyHdrEnvironmentToScene}.
 * Does NOT create a visible skybox (IBL only).
 *
 * @param options - Scene and HDR environment config.
 * @returns BabylonResult containing the HDR environment instance.
 *
 * @example
 * ```typescript
 * const result = loadHdrEnvironment({
 *   scene,
 *   config: { enabled: true, texturePath: 'env.hdr', intensity: 1.5, rotationY: 0 },
 * });
 * if (!result.ok) return result;
 * result.data.texture; // BABYLON.HDRCubeTexture
 * ```
 */
export function loadHdrEnvironment(options: LoadHdrOptions): BabylonResult<HdrEnvironmentInstance> {
	const { scene, config } = options;

	if (!config.texturePath || config.texturePath.length === 0) {
		return err(ERRORS.ASSET.IMPORT_FAILED, 'HDR environment texture path is empty');
	}

	try {
		const texture: BABYLON.HDRCubeTexture = new BABYLON.HDRCubeTexture(
			config.texturePath,
			scene,
			256,
		);

		return applyHdrEnvironmentToScene({
			scene,
			texture,
			intensity: config.intensity,
			rotationY: config.rotationY,
		});
	} catch (error: unknown) {
		return err(ERRORS.ASSET.IMPORT_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Dispose
// =============================================================================

/**
 * Disposes the HDR environment texture and clears the scene reference.
 *
 * @param options - The HDR environment instance to dispose.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * disposeHdrEnvironment({ instance: hdrEnvInstance });
 * ```
 */
export function disposeHdrEnvironment(options: DisposeHdrOptions): BabylonResult<Bool> {
	try {
		const { instance } = options;
		instance.texture.dispose();
		instance.scene.environmentTexture = null;
		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

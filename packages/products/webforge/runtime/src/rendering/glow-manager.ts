/**
 * Glow manager — creates, updates, and disposes a GlowLayer.
 *
 * GlowLayer is a global post-processing effect separate from bloom.
 * It adds an emissive glow around bright materials and meshes.
 *
 * @example
 * ```typescript
 * import { createGlowLayer, disposeGlowLayer } from './glow-manager';
 *
 * const result = createGlowLayer({ scene, config: glowConfig });
 * if (!result.ok) return result;
 * // result.data is a BABYLON.GlowLayer
 * disposeGlowLayer({ glowLayer: result.data });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { GlowLayerConfig } from '../schemas/lighting-config';

// =============================================================================
// Create
// =============================================================================

/** Options for creating a glow layer. */
type CreateGlowLayerOptions = {
	readonly scene: BABYLON.Scene;
	readonly config: Partial<GlowLayerConfig>;
};

/**
 * Creates a GlowLayer on the scene.
 *
 * @param options - Scene and glow configuration.
 * @returns BabylonResult containing the glow layer.
 */
export function createGlowLayer(options: CreateGlowLayerOptions): BabylonResult<BABYLON.GlowLayer> {
	try {
		const { scene, config } = options;
		const blurKernelSize: number = config.blurKernelSize ?? 32;
		const mainTextureRatio: number = config.mainTextureRatio ?? 0.5;

		const glowLayer: BABYLON.GlowLayer = new BABYLON.GlowLayer('webforge-glow', scene, {
			blurKernelSize,
			mainTextureRatio,
		});

		glowLayer.intensity = config.intensity ?? 0.5;

		return okShallow(glowLayer);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Update
// =============================================================================

/** Options for updating a glow layer. */
type UpdateGlowLayerOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
	readonly config: Partial<GlowLayerConfig>;
};

/**
 * Updates an existing GlowLayer's intensity.
 *
 * @param options - The glow layer and new config.
 * @returns BabylonResult indicating success.
 */
export function updateGlowLayer(options: UpdateGlowLayerOptions): BabylonResult<Bool> {
	try {
		const { glowLayer, config } = options;
		if (config.intensity !== undefined) {
			glowLayer.intensity = config.intensity;
		}
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// Dispose
// =============================================================================

/** Options for disposing a glow layer. */
type DisposeGlowLayerOptions = {
	readonly glowLayer: BABYLON.GlowLayer;
};

/**
 * Disposes a GlowLayer and its resources.
 *
 * @param options - The glow layer to dispose.
 * @returns BabylonResult indicating success.
 */
export function disposeGlowLayer(options: DisposeGlowLayerOptions): BabylonResult<Bool> {
	try {
		options.glowLayer.dispose();
		return okUnchecked(true);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

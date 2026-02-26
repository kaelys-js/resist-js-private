/**
 * Post-processing pipeline orchestrator.
 *
 * Creates, updates, and disposes the Babylon.js `DefaultRenderingPipeline`
 * and optional `SSAO2RenderingPipeline` from a resolved
 * {@link PostProcessingConfig}. Handles property mapping between the
 * config schema and Babylon.js pipeline properties.
 *
 * @example
 * ```typescript
 * import { createPostProcessingPipeline, disposePostProcessingPipeline } from './post-processing';
 *
 * const result = createPostProcessingPipeline({ scene, cameras, config });
 * if (!result.ok) return result;
 *
 * // Later:
 * disposePostProcessingPipeline({ pipeline: result.data });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import type { PostProcessingConfig } from '../schemas/post-processing-config';
import { okShallow, type BabylonResult } from '../core/babylon-result';
import { buildColorCurves } from './post-processing-presets';
import {
	loadHdrEnvironment,
	disposeHdrEnvironment,
	type HdrEnvironmentInstance,
} from './hdr-environment';

// =============================================================================
// Types
// =============================================================================

/** Post-processing pipeline instance returned by {@link createPostProcessingPipeline}. */
export type PostProcessingPipeline = {
	readonly pipeline: BABYLON.DefaultRenderingPipeline;
	readonly ssaoPipeline: BABYLON.SSAO2RenderingPipeline | null;
	readonly hdrEnvironment: HdrEnvironmentInstance | null;
	readonly scene: BABYLON.Scene;
	readonly config: PostProcessingConfig;
};

/** Options for {@link createPostProcessingPipeline}. */
type CreatePipelineOptions = {
	readonly scene: BABYLON.Scene;
	readonly cameras: BABYLON.Camera[];
	readonly config: PostProcessingConfig;
};

/** Options for {@link updatePostProcessingConfig}. */
type UpdatePipelineOptions = {
	readonly pipeline: PostProcessingPipeline;
	readonly config: PostProcessingConfig;
};

/** Options for {@link disposePostProcessingPipeline}. */
type DisposePipelineOptions = {
	readonly pipeline: PostProcessingPipeline;
};

// =============================================================================
// Tone Mapping Type Mapping
// =============================================================================

/**
 * Maps config tone mapping type string to Babylon.js constant.
 *
 * @param type - Config tone mapping type.
 * @returns Babylon.js tone mapping constant.
 */
function mapToneMappingType(type: string): number {
	switch (type) {
		case 'aces': {
			return BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
		}
		case 'khr_pbr_neutral': {
			return BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
		}
		default: {
			return BABYLON.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
		}
	}
}

// =============================================================================
// DoF Blur Level Mapping
// =============================================================================

/**
 * Maps config DoF blur level string to Babylon.js enum.
 *
 * @param level - Config blur level.
 * @returns Babylon.js DepthOfFieldEffectBlurLevel value.
 */
function mapDofBlurLevel(level: string): number {
	switch (level) {
		case 'low': {
			return BABYLON.DepthOfFieldEffectBlurLevel.Low;
		}
		case 'high': {
			return BABYLON.DepthOfFieldEffectBlurLevel.High;
		}
		default: {
			return BABYLON.DepthOfFieldEffectBlurLevel.Medium;
		}
	}
}

// =============================================================================
// Vignette Blend Mode Mapping
// =============================================================================

/**
 * Maps config vignette blend mode string to Babylon.js constant.
 *
 * @param mode - Config blend mode.
 * @returns Babylon.js vignette blend mode constant.
 */
function mapVignetteBlendMode(mode: string): number {
	if (mode === 'opaque') {
		return BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_OPAQUE;
	}
	return BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
}

// =============================================================================
// Apply Config to Pipeline
// =============================================================================

/**
 * Applies a resolved PostProcessingConfig to an existing DefaultRenderingPipeline.
 *
 * Sets all effect properties from the config. When `config.enabled` is false,
 * all effects are disabled regardless of their individual settings.
 *
 * @param pipeline - The Babylon.js DefaultRenderingPipeline instance.
 * @param config - The fully resolved PostProcessingConfig.
 */
function applyConfigToPipeline(
	pipeline: BABYLON.DefaultRenderingPipeline,
	config: PostProcessingConfig,
): void {
	const masterEnabled: boolean = config.enabled;

	// ---- Bloom ----
	pipeline.bloomEnabled = masterEnabled && (config.bloom?.enabled ?? false);
	if (config.bloom) {
		pipeline.bloomWeight = config.bloom.weight;
		pipeline.bloomThreshold = config.bloom.threshold;
		pipeline.bloomKernel = config.bloom.kernel;
		pipeline.bloomScale = config.bloom.scale;
	}

	// ---- Depth of Field ----
	pipeline.depthOfFieldEnabled = masterEnabled && (config.depthOfField?.enabled ?? false);
	if (config.depthOfField) {
		pipeline.depthOfFieldBlurLevel = mapDofBlurLevel(config.depthOfField.blurLevel);
		pipeline.depthOfField.focalLength = config.depthOfField.focalLength;
		pipeline.depthOfField.fStop = config.depthOfField.fStop;
		pipeline.depthOfField.focusDistance = config.depthOfField.focusDistance;
	}

	// ---- FXAA ----
	pipeline.fxaaEnabled = masterEnabled && (config.fxaa?.enabled ?? false);

	// ---- Chromatic Aberration ----
	pipeline.chromaticAberrationEnabled =
		masterEnabled && (config.chromaticAberration?.enabled ?? false);
	if (config.chromaticAberration) {
		pipeline.chromaticAberration.aberrationAmount = config.chromaticAberration.amount;
		pipeline.chromaticAberration.radialIntensity = config.chromaticAberration.radialIntensity;
	}

	// ---- Grain ----
	pipeline.grainEnabled = masterEnabled && (config.grain?.enabled ?? false);
	if (config.grain) {
		pipeline.grain.intensity = config.grain.intensity;
		pipeline.grain.animated = config.grain.animated;
	}

	// ---- Sharpen ----
	pipeline.sharpenEnabled = masterEnabled && (config.sharpen?.enabled ?? false);
	if (config.sharpen) {
		pipeline.sharpen.edgeAmount = config.sharpen.edgeAmount;
		pipeline.sharpen.colorAmount = config.sharpen.colorAmount;
	}

	// ---- Image Processing (tone mapping, vignette, color grading, dithering, exposure, contrast) ----
	pipeline.imageProcessingEnabled = true;
	const imgProc: BABYLON.ImageProcessingPostProcess = pipeline.imageProcessing;

	imgProc.exposure = config.exposure;
	imgProc.contrast = config.contrast;

	// Tone mapping
	imgProc.toneMappingEnabled = masterEnabled && (config.toneMapping?.enabled ?? false);
	if (config.toneMapping) {
		imgProc.toneMappingType = mapToneMappingType(config.toneMapping.type);
	}

	// Vignette
	imgProc.vignetteEnabled = masterEnabled && (config.vignette?.enabled ?? false);
	if (config.vignette) {
		imgProc.vignetteWeight = config.vignette.weight;
		imgProc.vignetteStretch = config.vignette.stretch;
		imgProc.vignetteBlendMode = mapVignetteBlendMode(config.vignette.blendMode);
		imgProc.vignetteColor = new BABYLON.Color4(
			config.vignette.color.r,
			config.vignette.color.g,
			config.vignette.color.b,
			config.vignette.color.a,
		);
	}

	// Color grading (color curves)
	imgProc.colorCurvesEnabled = masterEnabled && (config.colorGrading?.enabled ?? false);
	if (config.colorGrading?.enabled && config.colorGrading.preset) {
		const curvesResult = buildColorCurves(config.colorGrading.preset);
		if (curvesResult.ok) {
			imgProc.colorCurves = curvesResult.data;
		}
	}

	// Dithering
	imgProc.ditheringEnabled = masterEnabled && (config.dithering?.enabled ?? false);
	if (config.dithering) {
		imgProc.ditheringIntensity = config.dithering.intensity;
	}
}

// =============================================================================
// Create
// =============================================================================

/**
 * Creates the post-processing pipeline from a resolved config.
 *
 * Creates a `DefaultRenderingPipeline` for bloom, DoF, FXAA, grain,
 * sharpen, chromatic aberration, and image processing effects. Optionally
 * creates an `SSAO2RenderingPipeline` if SSAO is enabled. Optionally
 * loads an HDR environment if configured.
 *
 * @param options - Scene, cameras, and resolved config.
 * @returns BabylonResult containing the pipeline instance.
 *
 * @example
 * ```typescript
 * const result = createPostProcessingPipeline({
 *   scene,
 *   cameras: scene.cameras,
 *   config: resolvedConfig,
 * });
 * if (!result.ok) return result;
 * result.data.pipeline; // DefaultRenderingPipeline
 * ```
 */
export function createPostProcessingPipeline(
	options: CreatePipelineOptions,
): BabylonResult<PostProcessingPipeline> {
	const { scene, cameras, config } = options;

	try {
		// Create DefaultRenderingPipeline
		const pipeline: BABYLON.DefaultRenderingPipeline = new BABYLON.DefaultRenderingPipeline(
			'webforge-post-processing',
			true,
			scene,
			cameras,
		);

		// Apply all config properties
		applyConfigToPipeline(pipeline, config);

		// Create SSAO2 pipeline if enabled
		let ssaoPipeline: BABYLON.SSAO2RenderingPipeline | null = null;
		if (config.enabled && config.ssao?.enabled) {
			ssaoPipeline = new BABYLON.SSAO2RenderingPipeline('webforge-ssao', scene, 1.0, cameras);
			ssaoPipeline.totalStrength = config.ssao.totalStrength;
			ssaoPipeline.radius = config.ssao.radius;
			ssaoPipeline.samples = config.ssao.samples;
			ssaoPipeline.base = config.ssao.base;
			ssaoPipeline.expensiveBlur = config.ssao.expensiveBlur;
		}

		// Load HDR environment if enabled
		let hdrEnvironment: HdrEnvironmentInstance | null = null;
		if (config.enabled && config.hdrEnvironment?.enabled) {
			const hdrResult = loadHdrEnvironment({
				scene,
				config: config.hdrEnvironment,
			});
			if (hdrResult.ok) {
				hdrEnvironment = hdrResult.data;
			}
			// Non-fatal: HDR load failure doesn't block pipeline creation
		}

		const instance: PostProcessingPipeline = {
			pipeline,
			ssaoPipeline,
			hdrEnvironment,
			scene,
			config,
		};

		return okShallow(instance);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Update
// =============================================================================

/**
 * Updates an existing pipeline with a new config.
 *
 * Modifies pipeline properties in-place. Does not recreate the pipeline.
 * SSAO pipeline changes (enable/disable) are not supported via update —
 * recreate the pipeline for SSAO changes.
 *
 * @param options - Pipeline instance and new config.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * const result = updatePostProcessingConfig({
 *   pipeline: existingPipeline,
 *   config: newResolvedConfig,
 * });
 * ```
 */
export function updatePostProcessingConfig(options: UpdatePipelineOptions): BabylonResult<Bool> {
	try {
		const { pipeline, config } = options;
		applyConfigToPipeline(pipeline.pipeline, config);

		// Update SSAO properties if pipeline exists
		if (pipeline.ssaoPipeline && config.ssao) {
			pipeline.ssaoPipeline.totalStrength = config.ssao.totalStrength;
			pipeline.ssaoPipeline.radius = config.ssao.radius;
			pipeline.ssaoPipeline.samples = config.ssao.samples;
			pipeline.ssaoPipeline.base = config.ssao.base;
			pipeline.ssaoPipeline.expensiveBlur = config.ssao.expensiveBlur;
		}

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Dispose
// =============================================================================

/**
 * Disposes the post-processing pipeline and all sub-objects.
 *
 * Disposes the DefaultRenderingPipeline, SSAO2 pipeline (if present),
 * and HDR environment (if present).
 *
 * @param options - The pipeline instance to dispose.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * disposePostProcessingPipeline({ pipeline: pipelineInstance });
 * ```
 */
export function disposePostProcessingPipeline(
	options: DisposePipelineOptions,
): BabylonResult<Bool> {
	try {
		const { pipeline } = options;

		// Dispose HDR environment
		if (pipeline.hdrEnvironment) {
			disposeHdrEnvironment({ instance: pipeline.hdrEnvironment });
		}

		// Dispose SSAO pipeline
		if (pipeline.ssaoPipeline) {
			pipeline.ssaoPipeline.dispose();
		}

		// Dispose main pipeline
		pipeline.pipeline.dispose();

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

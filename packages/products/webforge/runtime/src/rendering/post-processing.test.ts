/**
 * Tests for post-processing pipeline orchestrator.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { PostProcessingConfig } from '../schemas/post-processing-config';
import { resolvePostProcessingConfig } from './post-processing-presets';

import {
	createPostProcessingPipeline,
	disposePostProcessingPipeline,
	updatePostProcessingConfig,
	type PostProcessingPipeline,
} from './post-processing';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolves a config from partial overrides, throwing on failure.
 *
 * @param overrides - Partial config overrides.
 * @returns Fully resolved PostProcessingConfig.
 */
function resolveConfig(overrides: Record<string, unknown> = {}): PostProcessingConfig {
	const result = resolvePostProcessingConfig(overrides);
	if (!result.ok) throw new Error('Failed to resolve config');
	return result.data;
}

// =============================================================================
// createPostProcessingPipeline
// =============================================================================

describe('createPostProcessingPipeline', () => {
	let engineInstance: BabylonEngineInstance;

	beforeEach(() => {
		const result = createTestEngine();
		if (!result.ok) throw new Error('Failed to create test engine');
		engineInstance = result.data;
		// eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
		new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), engineInstance.scene);
	});

	afterEach(() => {
		disposeEngine(engineInstance);
	});

	it('creates pipeline with hd2d preset', () => {
		const config: PostProcessingConfig = resolveConfig({ preset: 'hd2d' });
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline).toBeInstanceOf(BABYLON.DefaultRenderingPipeline);
		expect(result.data.config).toBe(config);
	});

	it('creates pipeline with neutral preset (all disabled)', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'neutral',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.bloomEnabled).toBe(false);
		expect(result.data.pipeline.depthOfFieldEnabled).toBe(false);
		expect(result.data.pipeline.fxaaEnabled).toBe(false);
		expect(result.data.pipeline.chromaticAberrationEnabled).toBe(false);
		expect(result.data.pipeline.grainEnabled).toBe(false);
		expect(result.data.pipeline.sharpenEnabled).toBe(false);
	});

	it('creates pipeline with enabled=false (master disable)', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
			enabled: false,
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// When master-disabled, all effects should be off
		expect(result.data.pipeline.bloomEnabled).toBe(false);
		expect(result.data.pipeline.depthOfFieldEnabled).toBe(false);
		expect(result.data.pipeline.fxaaEnabled).toBe(false);
		expect(result.data.ssaoPipeline).toBeNull();
	});

	it('creates SSAO pipeline when SSAO is enabled', () => {
		const config: PostProcessingConfig = resolveConfig({ preset: 'hd2d' });
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssaoPipeline).toBeInstanceOf(BABYLON.SSAO2RenderingPipeline);
	});

	it('skips SSAO pipeline when SSAO is disabled', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'neutral',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssaoPipeline).toBeNull();
	});

	it('maps bloom properties correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.bloomEnabled).toBe(true);
		expect(result.data.pipeline.bloomWeight).toBe(0.15);
		expect(result.data.pipeline.bloomThreshold).toBe(0.85);
		expect(result.data.pipeline.bloomKernel).toBe(64);
		expect(result.data.pipeline.bloomScale).toBe(0.5);
	});

	it('maps depth of field properties correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.depthOfFieldEnabled).toBe(true);
		expect(result.data.pipeline.depthOfField.focalLength).toBe(50);
		expect(result.data.pipeline.depthOfField.fStop).toBe(2.8);
		// focusDistance=0 in preset; auto-calibrate reads camera radius (FreeCamera has none, stays 0)
		expect(result.data.pipeline.depthOfField.focusDistance).toBe(0);
	});

	it('maps tone mapping type correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			toneMapping: { type: 'aces' },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.imageProcessing.toneMappingEnabled).toBe(true);
		expect(result.data.pipeline.imageProcessing.toneMappingType).toBe(
			BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES,
		);
	});

	it('maps vignette properties correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.imageProcessing.vignetteEnabled).toBe(true);
		expect(result.data.pipeline.imageProcessing.vignetteWeight).toBe(1.5);
	});

	it('maps vignette blend mode multiply', () => {
		const config: PostProcessingConfig = resolveConfig({
			vignette: { blendMode: 'multiply' },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.imageProcessing.vignetteBlendMode).toBe(
			BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY,
		);
	});

	it('maps exposure and contrast correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			exposure: 0.9,
			contrast: 1.2,
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.imageProcessing.exposure).toBeCloseTo(0.9);
		expect(result.data.pipeline.imageProcessing.contrast).toBeCloseTo(1.2);
	});

	it('maps SSAO properties correctly', () => {
		const config: PostProcessingConfig = resolveConfig({
			ssao: { totalStrength: 1.5, radius: 3.0, samples: 24 },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ssaoPipeline).not.toBeNull();
		if (!result.data.ssaoPipeline) return;
		expect(result.data.ssaoPipeline.totalStrength).toBe(1.5);
		expect(result.data.ssaoPipeline.radius).toBe(3.0);
		expect(result.data.ssaoPipeline.samples).toBe(24);
	});

	it('maps chromatic aberration properties', () => {
		const config: PostProcessingConfig = resolveConfig({
			chromaticAberration: { enabled: true, amount: 20 },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.chromaticAberrationEnabled).toBe(true);
		expect(result.data.pipeline.chromaticAberration.aberrationAmount).toBe(20);
	});

	it('maps sharpen properties', () => {
		const config: PostProcessingConfig = resolveConfig({
			sharpen: { enabled: true, edgeAmount: 0.5 },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.sharpenEnabled).toBe(true);
		expect(result.data.pipeline.sharpen.edgeAmount).toBe(0.5);
	});

	it('maps grain properties', () => {
		const config: PostProcessingConfig = resolveConfig({
			grain: { enabled: true, intensity: 15, animated: false },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.grainEnabled).toBe(true);
		expect(result.data.pipeline.grain.intensity).toBe(15);
		expect(result.data.pipeline.grain.animated).toBe(false);
	});

	it('creates pipeline with cinematic preset', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'cinematic',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.bloomWeight).toBe(0.3);
		expect(result.data.pipeline.bloomThreshold).toBe(0.7);
		expect(result.data.pipeline.chromaticAberrationEnabled).toBe(true);
	});

	it('creates pipeline with retro preset', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'retro',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.bloomEnabled).toBe(false);
		expect(result.data.pipeline.depthOfFieldEnabled).toBe(false);
		expect(result.data.pipeline.sharpenEnabled).toBe(true);
	});

	it('creates pipeline with fantasy preset', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'fantasy',
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.bloomWeight).toBe(0.25);
		expect(result.data.pipeline.bloomThreshold).toBe(0.6);
	});

	it('maps color grading when enabled', () => {
		const config: PostProcessingConfig = resolveConfig({
			colorGrading: { enabled: true, preset: 'warm' },
		});
		const result = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.pipeline.imageProcessing.colorCurvesEnabled).toBe(true);
		expect(result.data.pipeline.imageProcessing.colorCurves).toBeInstanceOf(BABYLON.ColorCurves);
	});
});

// =============================================================================
// updatePostProcessingConfig
// =============================================================================

describe('updatePostProcessingConfig', () => {
	let engineInstance: BabylonEngineInstance;
	let pipeline: PostProcessingPipeline;

	beforeEach(() => {
		const engineResult = createTestEngine();
		if (!engineResult.ok) throw new Error('Failed to create test engine');
		engineInstance = engineResult.data;
		// eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
		new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), engineInstance.scene);

		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const pipelineResult = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		if (!pipelineResult.ok) throw new Error('Failed to create pipeline');
		pipeline = pipelineResult.data;
	});

	afterEach(() => {
		disposePostProcessingPipeline({ pipeline });
		disposeEngine(engineInstance);
	});

	it('updates bloom weight', () => {
		const newConfig: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
			bloom: { weight: 0.5 },
		});
		const result = updatePostProcessingConfig({
			pipeline,
			config: newConfig,
		});
		expect(result.ok).toBe(true);
		expect(pipeline.pipeline.bloomWeight).toBe(0.5);
	});

	it('updates exposure and contrast', () => {
		const newConfig: PostProcessingConfig = resolveConfig({
			exposure: 0.8,
			contrast: 1.5,
		});
		const result = updatePostProcessingConfig({
			pipeline,
			config: newConfig,
		});
		expect(result.ok).toBe(true);
		expect(pipeline.pipeline.imageProcessing.exposure).toBeCloseTo(0.8);
		expect(pipeline.pipeline.imageProcessing.contrast).toBeCloseTo(1.5);
	});

	it('disables bloom via update', () => {
		const newConfig: PostProcessingConfig = resolveConfig({
			bloom: { enabled: false },
		});
		const result = updatePostProcessingConfig({
			pipeline,
			config: newConfig,
		});
		expect(result.ok).toBe(true);
		expect(pipeline.pipeline.bloomEnabled).toBe(false);
	});
});

// =============================================================================
// disposePostProcessingPipeline
// =============================================================================

describe('disposePostProcessingPipeline', () => {
	let engineInstance: BabylonEngineInstance;

	beforeEach(() => {
		const result = createTestEngine();
		if (!result.ok) throw new Error('Failed to create test engine');
		engineInstance = result.data;
		// eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
		new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), engineInstance.scene);
	});

	afterEach(() => {
		disposeEngine(engineInstance);
	});

	it('disposes pipeline without error', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const createResult = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = disposePostProcessingPipeline({
			pipeline: createResult.data,
		});
		expect(result.ok).toBe(true);
	});

	it('disposes SSAO pipeline when present', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'hd2d',
		});
		const createResult = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;
		expect(createResult.data.ssaoPipeline).not.toBeNull();

		const result = disposePostProcessingPipeline({
			pipeline: createResult.data,
		});
		expect(result.ok).toBe(true);
	});

	it('handles dispose when no SSAO pipeline', () => {
		const config: PostProcessingConfig = resolveConfig({
			preset: 'neutral',
		});
		const createResult = createPostProcessingPipeline({
			scene: engineInstance.scene,
			cameras: engineInstance.scene.cameras,
			config,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const result = disposePostProcessingPipeline({
			pipeline: createResult.data,
		});
		expect(result.ok).toBe(true);
	});
});

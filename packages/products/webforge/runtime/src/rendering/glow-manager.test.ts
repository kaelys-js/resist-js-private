/**
 * Glow manager tests.
 *
 * Tests GlowLayer creation, property application, update, and disposal.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { GlowLayerConfigSchema, GLOW_QUALITY_PRESETS } from '../schemas/lighting-config';
import { applySceneSetup } from './scene-setup';
import { createGlowLayer, disposeGlowLayer, updateGlowLayer } from './glow-manager';

let instance: BabylonEngineInstance;

beforeEach(() => {
	const result = createTestEngine();
	if (!result.ok) throw new Error('Failed to create test engine');
	instance = result.data;
	const setupResult = applySceneSetup(instance.scene, {});
	if (!setupResult.ok) throw new Error('Failed to apply scene setup');
});

afterEach(() => {
	disposeEngine(instance);
});

// =============================================================================
// GlowLayerConfigSchema
// =============================================================================

describe('GlowLayerConfigSchema', () => {
	test('validates default config', () => {
		const result = safeParse(GlowLayerConfigSchema, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.enabled).toBe(false);
		expect(result.data.intensity).toBe(0.5);
		expect(result.data.blurKernelSize).toBe(32);
		expect(result.data.mainTextureRatio).toBe(0.5);
		expect(result.data.mainTextureSamples).toBe(1);
		expect(result.data.ldrMerge).toBe(false);
	});

	test('validates mainTextureSamples within range', () => {
		const valid = safeParse(GlowLayerConfigSchema, { mainTextureSamples: 4 });
		expect(valid.ok).toBe(true);
		const invalid = safeParse(GlowLayerConfigSchema, { mainTextureSamples: 8 });
		expect(invalid.ok).toBe(false);
	});

	test('validates mainTextureFixedSize enum values', () => {
		for (const size of [256, 512, 1024, 2048]) {
			const result = safeParse(GlowLayerConfigSchema, { mainTextureFixedSize: size });
			expect(result.ok).toBe(true);
		}
		const invalid = safeParse(GlowLayerConfigSchema, { mainTextureFixedSize: 100 });
		expect(invalid.ok).toBe(false);
	});

	test('validates ldrMerge boolean', () => {
		const result = safeParse(GlowLayerConfigSchema, { ldrMerge: true });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.ldrMerge).toBe(true);
	});

	test('validates neutralColor hex string', () => {
		const valid = safeParse(GlowLayerConfigSchema, { neutralColor: '#ff00ff80' });
		expect(valid.ok).toBe(true);
		const short = safeParse(GlowLayerConfigSchema, { neutralColor: '#abc' });
		expect(short.ok).toBe(false);
	});
});

// =============================================================================
// GLOW_QUALITY_PRESETS
// =============================================================================

describe('GLOW_QUALITY_PRESETS', () => {
	test('has low/medium/high/ultra presets', () => {
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('low');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('medium');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('high');
		expect(GLOW_QUALITY_PRESETS).toHaveProperty('ultra');
	});

	test('presets have increasing quality', () => {
		expect(GLOW_QUALITY_PRESETS.low.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.medium.mainTextureRatio,
		);
		expect(GLOW_QUALITY_PRESETS.medium.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.high.mainTextureRatio,
		);
		expect(GLOW_QUALITY_PRESETS.high.mainTextureRatio).toBeLessThan(
			GLOW_QUALITY_PRESETS.ultra.mainTextureRatio,
		);
	});

	test('each preset validates against schema', () => {
		for (const [, preset] of Object.entries(GLOW_QUALITY_PRESETS)) {
			const result = safeParse(GlowLayerConfigSchema, preset);
			expect(result.ok).toBe(true);
		}
	});
});

// =============================================================================
// createGlowLayer
// =============================================================================

describe('createGlowLayer', () => {
	test('creates glow layer with valid config', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies intensity', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.8, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.intensity).toBeCloseTo(0.8);
	});

	test('name is webforge-glow', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.name).toBe('webforge-glow');
	});
});

// =============================================================================
// updateGlowLayer
// =============================================================================

describe('updateGlowLayer', () => {
	test('updates intensity', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed to create glow layer');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { enabled: true, intensity: 1.2, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		expect(updateResult.ok).toBeTruthy();
		expect(createResult.data.intensity).toBeCloseTo(1.2);
	});
});

// =============================================================================
// disposeGlowLayer
// =============================================================================

describe('disposeGlowLayer', () => {
	test('disposes glow layer successfully', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5, blurKernelSize: 32, mainTextureRatio: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed to create glow layer');

		const result = disposeGlowLayer({ glowLayer: createResult.data });
		expect(result.ok).toBeTruthy();
	});
});

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
import {
	createGlowLayer,
	disposeGlowLayer,
	updateGlowLayer,
	excludeMeshFromGlow,
	includeOnlyMeshInGlow,
	removeMeshFromGlow,
	excludeUiMeshes,
	setCustomEmissiveColor,
	clearCustomEmissiveColor,
} from './glow-manager';

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

// =============================================================================
// createGlowLayer — new constructor options
// =============================================================================

describe('createGlowLayer — new constructor options', () => {
	test('applies mainTextureSamples', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureSamples: 4 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies ldrMerge option', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, ldrMerge: true },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies mainTextureFixedSize', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureFixedSize: 512 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.GlowLayer);
	});

	test('applies neutralColor', () => {
		const result = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, neutralColor: '#ff000080' },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.neutralColor).toBeDefined();
	});
});

// =============================================================================
// updateGlowLayer — expanded
// =============================================================================

describe('updateGlowLayer — expanded', () => {
	test('updates blurKernelSize', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, blurKernelSize: 32 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { blurKernelSize: 64 },
		});
		expect(updateResult.ok).toBe(true);
		expect(createResult.data.blurKernelSize).toBe(64);
	});

	test('updates isEnabled', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		expect(createResult.data.isEnabled).toBe(true);
		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { enabled: false },
		});
		expect(updateResult.ok).toBe(true);
		expect(createResult.data.isEnabled).toBe(false);
	});

	test('detects constructor-only change needing recreate', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, mainTextureRatio: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { mainTextureRatio: 0.75 },
			previousConfig: { mainTextureRatio: 0.5 },
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;
		expect(updateResult.data.needsRecreate).toBe(true);
	});

	test('no recreate needed for runtime-only changes', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true, intensity: 0.5 },
		});
		if (!createResult.ok) throw new Error('Failed');

		const updateResult = updateGlowLayer({
			glowLayer: createResult.data,
			config: { intensity: 1.0 },
			previousConfig: { intensity: 0.5 },
		});
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;
		expect(updateResult.data.needsRecreate).toBe(false);
	});
});

// =============================================================================
// Mesh management
// =============================================================================

describe('mesh management', () => {
	test('excludeMeshFromGlow excludes a mesh', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround(
			'test-mesh',
			{ width: 1, height: 1 },
			instance.scene,
		);
		const result = excludeMeshFromGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('includeOnlyMeshInGlow includes a mesh', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround(
			'test-mesh',
			{ width: 1, height: 1 },
			instance.scene,
		);
		const result = includeOnlyMeshInGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('removeMeshFromGlow removes exclusion/inclusion', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const mesh = BABYLON.MeshBuilder.CreateGround(
			'test-mesh',
			{ width: 1, height: 1 },
			instance.scene,
		);
		excludeMeshFromGlow({ glowLayer: createResult.data, mesh });
		const result = removeMeshFromGlow({ glowLayer: createResult.data, mesh });
		expect(result.ok).toBe(true);
	});

	test('excludeUiMeshes excludes all renderingGroupId=3 meshes', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const uiMesh = BABYLON.MeshBuilder.CreateGround(
			'ui-mesh',
			{ width: 1, height: 1 },
			instance.scene,
		);
		uiMesh.renderingGroupId = 3;
		const normalMesh = BABYLON.MeshBuilder.CreateGround(
			'normal-mesh',
			{ width: 1, height: 1 },
			instance.scene,
		);
		normalMesh.renderingGroupId = 2;

		const result = excludeUiMeshes({ glowLayer: createResult.data, scene: instance.scene });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeGreaterThan(0);
	});
});

// =============================================================================
// Custom emissive color selector
// =============================================================================

describe('custom emissive color selector', () => {
	test('setCustomEmissiveColor sets the selector', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		const result = setCustomEmissiveColor({
			glowLayer: createResult.data,
			color: new BABYLON.Color4(1, 0, 0, 1),
		});
		expect(result.ok).toBe(true);
		expect(createResult.data.customEmissiveColorSelector).toBeDefined();
	});

	test('clearCustomEmissiveColor removes the selector', () => {
		const createResult = createGlowLayer({
			scene: instance.scene,
			config: { enabled: true },
		});
		if (!createResult.ok) throw new Error('Failed');

		setCustomEmissiveColor({
			glowLayer: createResult.data,
			color: new BABYLON.Color4(1, 0, 0, 1),
		});
		const result = clearCustomEmissiveColor({ glowLayer: createResult.data });
		expect(result.ok).toBe(true);
		// Babylon.js sets to null when cleared
		const selector = createResult.data.customEmissiveColorSelector;
		expect(selector === null || selector === undefined).toBe(true);
	});
});

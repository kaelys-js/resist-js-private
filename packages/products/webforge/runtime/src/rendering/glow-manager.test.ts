/**
 * Glow manager tests.
 *
 * Tests GlowLayer creation, property application, update, and disposal.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
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

/**
 * Screen effects tests.
 *
 * Tests screen tint, flash, fade-in, fade-out overlay creation,
 * alpha animation setup, and disposal.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { screenTint, screenFlash, screenFadeIn, screenFadeOut } from './screen-effects';

let instance: BabylonEngineInstance;

beforeEach(() => {
	const result = createTestEngine();
	if (!result.ok) throw new Error('Failed to create test engine');
	instance = result.data;
});

afterEach(() => {
	disposeEngine(instance);
});

// =============================================================================
// screenTint
// =============================================================================

describe('screenTint', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 1, g: 0, b: 0, a: 0.5 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay mesh in the scene', () => {
		const meshCountBefore = instance.scene.meshes.length;
		const result = screenTint({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 1, a: 0.3 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.meshes.length).toBeGreaterThan(meshCountBefore);
		result.data.dispose();
	});

	test('dispose removes overlay mesh', () => {
		const result = screenTint({
			scene: instance.scene,
			color: { r: 0, g: 1, b: 0, a: 0.4 },
			durationMs: 1000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const meshCountBefore = instance.scene.meshes.length;
		result.data.dispose();
		expect(instance.scene.meshes.length).toBeLessThan(meshCountBefore);
	});
});

// =============================================================================
// screenFlash
// =============================================================================

describe('screenFlash', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFlash({
			scene: instance.scene,
			color: { r: 1, g: 1, b: 1, a: 1 },
			durationMs: 200,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay mesh', () => {
		const meshCountBefore = instance.scene.meshes.length;
		const result = screenFlash({
			scene: instance.scene,
			color: { r: 1, g: 1, b: 1, a: 1 },
			durationMs: 100,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.meshes.length).toBeGreaterThan(meshCountBefore);
		result.data.dispose();
	});
});

// =============================================================================
// screenFadeIn
// =============================================================================

describe('screenFadeIn', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFadeIn({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay mesh', () => {
		const meshCountBefore = instance.scene.meshes.length;
		const result = screenFadeIn({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 300,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.meshes.length).toBeGreaterThan(meshCountBefore);
		result.data.dispose();
	});
});

// =============================================================================
// screenFadeOut
// =============================================================================

describe('screenFadeOut', () => {
	test('returns ok with a dispose handle', () => {
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 500,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('creates overlay mesh', () => {
		const meshCountBefore = instance.scene.meshes.length;
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 300,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.meshes.length).toBeGreaterThan(meshCountBefore);
		result.data.dispose();
	});

	test('dispose removes overlay even during animation', () => {
		const result = screenFadeOut({
			scene: instance.scene,
			color: { r: 0, g: 0, b: 0, a: 1 },
			durationMs: 5000,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const meshCountBefore = instance.scene.meshes.length;
		result.data.dispose();
		expect(instance.scene.meshes.length).toBeLessThan(meshCountBefore);
	});
});

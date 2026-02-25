/**
 * Scene setup rendering tests.
 *
 * Tests applying scene defaults: clear color, ambient color, fog,
 * and the default hemispheric light.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { applySceneSetup } from './scene-setup';

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
// Clear Color
// =============================================================================

describe('applySceneSetup — clear color', () => {
	test('applies default clear color (dark blue-gray)', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.clearColor.r).toBeCloseTo(0.15);
		expect(instance.scene.clearColor.g).toBeCloseTo(0.15);
		expect(instance.scene.clearColor.b).toBeCloseTo(0.2);
		expect(instance.scene.clearColor.a).toBe(1);
	});

	test('applies custom clear color', () => {
		const result = applySceneSetup(instance.scene, {
			clearColor: { r: 0, g: 0, b: 0, a: 1 },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.clearColor.r).toBe(0);
		expect(instance.scene.clearColor.g).toBe(0);
		expect(instance.scene.clearColor.b).toBe(0);
	});
});

// =============================================================================
// Ambient Color
// =============================================================================

describe('applySceneSetup — ambient color', () => {
	test('applies default ambient color', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.ambientColor.r).toBeCloseTo(0.3);
		expect(instance.scene.ambientColor.g).toBeCloseTo(0.3);
		expect(instance.scene.ambientColor.b).toBeCloseTo(0.3);
	});

	test('applies custom ambient color', () => {
		const result = applySceneSetup(instance.scene, {
			ambientColor: { r: 0.5, g: 0.5, b: 0.5 },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.ambientColor.r).toBeCloseTo(0.5);
	});
});

// =============================================================================
// Default Light
// =============================================================================

describe('applySceneSetup — default light', () => {
	test('creates hemispheric light when defaultLight is true', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.lights.length).toBe(1);
		expect(instance.scene.lights[0]).toBeInstanceOf(BABYLON.HemisphericLight);
	});

	test('does not create light when defaultLight is false', () => {
		const result = applySceneSetup(instance.scene, { defaultLight: false });
		expect(result.ok).toBeTruthy();

		expect(instance.scene.lights.length).toBe(0);
	});

	test('applies default light intensity', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.lights[0]?.intensity).toBeCloseTo(0.7);
	});

	test('applies custom light intensity', () => {
		const result = applySceneSetup(instance.scene, {
			defaultLightIntensity: 1.5,
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.lights[0]?.intensity).toBeCloseTo(1.5);
	});

	test('applies ground color to hemispheric light', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		const [light] = instance.scene.lights;
		if (light instanceof BABYLON.HemisphericLight) {
			expect(light.groundColor.r).toBeCloseTo(0.2);
			expect(light.groundColor.g).toBeCloseTo(0.2);
			expect(light.groundColor.b).toBeCloseTo(0.2);
		}
	});
});

// =============================================================================
// Fog
// =============================================================================

describe('applySceneSetup — fog', () => {
	test('fog mode none (default — no fog config)', () => {
		const result = applySceneSetup(instance.scene, {});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_NONE);
	});

	test('fog mode none (explicit)', () => {
		const result = applySceneSetup(instance.scene, {
			fog: { mode: 'none' },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_NONE);
	});

	test('fog mode linear', () => {
		const result = applySceneSetup(instance.scene, {
			fog: { mode: 'linear', start: 20, end: 100 },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_LINEAR);
		expect(instance.scene.fogStart).toBe(20);
		expect(instance.scene.fogEnd).toBe(100);
	});

	test('fog mode exponential', () => {
		const result = applySceneSetup(instance.scene, {
			fog: { mode: 'exponential', density: 0.05 },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP);
		expect(instance.scene.fogDensity).toBeCloseTo(0.05);
	});

	test('fog mode exponential2', () => {
		const result = applySceneSetup(instance.scene, {
			fog: { mode: 'exponential2', density: 0.02 },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP2);
		expect(instance.scene.fogDensity).toBeCloseTo(0.02);
	});

	test('fog color is applied', () => {
		const result = applySceneSetup(instance.scene, {
			fog: { mode: 'linear', color: { r: 0.9, g: 0.9, b: 0.9 } },
		});
		expect(result.ok).toBeTruthy();

		expect(instance.scene.fogColor.r).toBeCloseTo(0.9);
		expect(instance.scene.fogColor.g).toBeCloseTo(0.9);
		expect(instance.scene.fogColor.b).toBeCloseTo(0.9);
	});
});

// =============================================================================
// Rejection
// =============================================================================

describe('applySceneSetup — rejection', () => {
	test('rejects invalid config', () => {
		const result = applySceneSetup(instance.scene, {
			clearColor: { r: 2, g: 0, b: 0 },
		});
		expect(result.ok).toBeFalsy();
	});

	test('rejects null config', () => {
		const result = applySceneSetup(instance.scene, null);
		expect(result.ok).toBeFalsy();
	});
});

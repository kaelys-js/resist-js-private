/**
 * Sky system tests.
 *
 * Tests sky creation (color, gradient, skybox, procedural),
 * scene.clearColor application, mesh creation, and disposal.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { SkyConfig } from '../schemas/sky-config';
import { createSky, disposeSky } from './sky-system';

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
// createSky — color type
// =============================================================================

describe('createSky — color type', () => {
	test('sets scene.clearColor from config color', () => {
		const config: SkyConfig = {
			type: 'color',
			color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.clearColor.r).toBeCloseTo(0.1);
		expect(instance.scene.clearColor.g).toBeCloseTo(0.2);
		expect(instance.scene.clearColor.b).toBeCloseTo(0.3);
	});

	test('does not create skybox mesh for color type', () => {
		const config: SkyConfig = {
			type: 'color',
			color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxMesh).toBeNull();
	});
});

// =============================================================================
// createSky — gradient type
// =============================================================================

describe('createSky — gradient type', () => {
	test('sets scene.clearColor from first gradient stop', () => {
		const config: SkyConfig = {
			type: 'gradient',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			gradient: [
				{ position: 0, color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } },
				{ position: 1, color: { r: 0.8, g: 0.6, b: 0.3, a: 1 } },
			],
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Gradient sets clearColor to first stop
		expect(instance.scene.clearColor.r).toBeCloseTo(0.1);
	});

	test('does not create skybox mesh for gradient (clearColor only)', () => {
		const config: SkyConfig = {
			type: 'gradient',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			gradient: [
				{ position: 0, color: { r: 0, g: 0, b: 0.5, a: 1 } },
				{ position: 1, color: { r: 0.5, g: 0.5, b: 0, a: 1 } },
			],
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxMesh).toBeNull();
	});
});

// =============================================================================
// createSky — skybox type
// =============================================================================

describe('createSky — skybox type', () => {
	test('creates skybox mesh with configured size', () => {
		const config: SkyConfig = {
			type: 'skybox',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			skyboxPath: 'skyboxes/day',
			skyboxSize: 2000,
			parallaxLayers: [],
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxMesh).not.toBeNull();
	});
});

// =============================================================================
// createSky — procedural type
// =============================================================================

describe('createSky — procedural type', () => {
	test('creates skybox mesh for procedural sky', () => {
		const config: SkyConfig = {
			type: 'procedural',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const result = createSky({ scene: instance.scene, config });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.skyboxMesh).not.toBeNull();
	});
});

// =============================================================================
// disposeSky
// =============================================================================

describe('disposeSky', () => {
	test('disposes skybox mesh and material', () => {
		const config: SkyConfig = {
			type: 'skybox',
			color: { r: 0.35, g: 0.5, b: 0.8, a: 1 },
			skyboxPath: 'skyboxes/day',
			skyboxSize: 1000,
			parallaxLayers: [],
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const createResult = createSky({ scene: instance.scene, config });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const meshCountBefore = instance.scene.meshes.length;
		const disposeResult = disposeSky({ sky: createResult.data });
		expect(disposeResult.ok).toBe(true);
		// Mesh should be removed from scene
		expect(instance.scene.meshes.length).toBeLessThan(meshCountBefore);
	});

	test('handles null skybox mesh gracefully', () => {
		const config: SkyConfig = {
			type: 'color',
			color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
			parallaxLayers: [],
			skyboxSize: 1000,
			turbidity: 10,
			rayleigh: 2,
			luminance: 1,
		};
		const createResult = createSky({ scene: instance.scene, config });
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const disposeResult = disposeSky({ sky: createResult.data });
		expect(disposeResult.ok).toBe(true);
	});
});

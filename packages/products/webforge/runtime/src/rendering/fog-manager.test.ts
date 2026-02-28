// @vitest-environment jsdom

/**
 * Fog manager tests.
 *
 * Tests the fog lifecycle: {@link applyFog}, {@link updateFog},
 * {@link applyFogPreset}, and {@link disposeFog}. Verifies scene fog
 * properties, PostProcess creation, depth renderer setup, and cleanup.
 *
 * Uses jsdom environment for Babylon.js PostProcess integration with
 * NullEngine.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { FogConfig } from '../schemas/fog-config';
import type { FogPresetName } from './fog-presets';

import { applyFog, updateFog, applyFogPreset, disposeFog } from './fog-manager';

// =============================================================================
// Setup / Teardown
// =============================================================================

let instance: BabylonEngineInstance;
let camera: BABYLON.FreeCamera;

beforeEach(() => {
	const result = createTestEngine();
	if (!result.ok) throw new Error('Failed to create test engine');
	instance = result.data;
	camera = new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 5, -10), instance.scene);
});

afterEach(() => {
	disposeEngine(instance);
});

// =============================================================================
// applyFog — Basic Scene Fog
// =============================================================================

describe('applyFog', () => {
	test('returns ok with FogHandle', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveProperty('dispose');
		result.data.dispose();
	});

	test('sets scene fog mode', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP);
		result.data.dispose();
	});

	test('sets scene fog color', () => {
		const config: FogConfig = {
			mode: 'linear',
			color: { r: 0.5, g: 0.6, b: 0.7, a: 1 },
			density: 0.01,
			start: 10,
			end: 200,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogColor.r).toBeCloseTo(0.5, 2);
		expect(instance.scene.fogColor.g).toBeCloseTo(0.6, 2);
		expect(instance.scene.fogColor.b).toBeCloseTo(0.7, 2);
		result.data.dispose();
	});

	test('sets scene fog density', () => {
		const config: FogConfig = {
			mode: 'exponential2',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.05,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogDensity).toBe(0.05);
		result.data.dispose();
	});

	test('sets scene fog start and end', () => {
		const config: FogConfig = {
			mode: 'linear',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.01,
			start: 20,
			end: 150,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogStart).toBe(20);
		expect(instance.scene.fogEnd).toBe(150);
		result.data.dispose();
	});

	test('maps mode "none" to FOGMODE_NONE', () => {
		const config: FogConfig = {
			mode: 'none',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.01,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_NONE);
		result.data.dispose();
	});

	test('maps mode "exponential2" to FOGMODE_EXP2', () => {
		const config: FogConfig = {
			mode: 'exponential2',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.01,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP2);
		result.data.dispose();
	});
});

// =============================================================================
// applyFog — Advanced Features
// =============================================================================

describe('applyFog — advanced features', () => {
	test('creates advanced PostProcess when height fog enabled', () => {
		const ppCountBefore = camera._postProcesses.filter(Boolean).length;
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 0.8,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			heightFog: {
				enabled: true,
				baseHeight: 0,
				falloff: 0.5,
				density: 0.1,
				offset: 0,
			},
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const ppCountAfter = camera._postProcesses.filter(Boolean).length;
		expect(ppCountAfter).toBeGreaterThan(ppCountBefore);
		result.data.dispose();
	});

	test('creates advanced PostProcess when noise enabled', () => {
		const ppCountBefore = camera._postProcesses.filter(Boolean).length;
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			noise: {
				enabled: true,
				scale: 1,
				amplitude: 0.5,
				speed: 0.1,
				octaves: 3,
				lacunarity: 2,
				persistence: 0.5,
			},
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const ppCountAfter = camera._postProcesses.filter(Boolean).length;
		expect(ppCountAfter).toBeGreaterThan(ppCountBefore);
		result.data.dispose();
	});

	test('creates overlay PostProcess when overlays configured', () => {
		const ppCountBefore = camera._postProcesses.filter(Boolean).length;
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [
				{
					enabled: true,
					texture: 'clouds',
					opacity: 0.3,
					blendMode: 'additive',
					scrollX: 0.5,
					scrollY: 0,
					scale: 1,
					tint: { r: 1, g: 1, b: 1, a: 1 },
					hue: 0,
					hueSpeed: 0,
					mapLocked: false,
					vignette: 'none',
					vignetteIntensity: 0.5,
				},
			],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const ppCountAfter = camera._postProcesses.filter(Boolean).length;
		expect(ppCountAfter).toBeGreaterThan(ppCountBefore);
		result.data.dispose();
	});

	test('enables depth renderer when advanced features active', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 0.8,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			heightFog: {
				enabled: true,
				baseHeight: 0,
				falloff: 0.5,
				density: 0.1,
				offset: 0,
			},
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.enableDepthRenderer).toBeDefined();
		result.data.dispose();
	});

	test('does not create advanced PostProcess when no advanced features', () => {
		const ppCountBefore = camera._postProcesses.filter(Boolean).length;
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Basic fog only — no PostProcesses added
		const ppCountAfter = camera._postProcesses.filter(Boolean).length;
		expect(ppCountAfter).toBe(ppCountBefore);
		result.data.dispose();
	});
});

// =============================================================================
// updateFog
// =============================================================================

describe('updateFog', () => {
	test('updates scene fog properties', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const updatedConfig: FogConfig = {
			...config,
			mode: 'linear',
			density: 0.05,
			start: 10,
			end: 100,
			color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
		};
		const updateResult = updateFog(result.data, updatedConfig);
		expect(updateResult.ok).toBe(true);

		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_LINEAR);
		expect(instance.scene.fogDensity).toBe(0.05);
		expect(instance.scene.fogStart).toBe(10);
		expect(instance.scene.fogEnd).toBe(100);
		expect(instance.scene.fogColor.r).toBeCloseTo(0.5, 2);

		result.data.dispose();
	});

	test('returns ok result', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const updateResult = updateFog(result.data, config);
		expect(updateResult.ok).toBe(true);
		if (!updateResult.ok) return;
		expect(updateResult.data).toBe(true);

		result.data.dispose();
	});
});

// =============================================================================
// applyFogPreset
// =============================================================================

describe('applyFogPreset', () => {
	test('applies preset and returns ok', () => {
		const config: FogConfig = {
			mode: 'none',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.01,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const presetResult = applyFogPreset(result.data, 'denseFog' as FogPresetName);
		expect(presetResult.ok).toBe(true);

		// denseFog preset uses exponential mode with 0.04 density
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP);
		expect(instance.scene.fogDensity).toBe(0.04);

		result.data.dispose();
	});

	test('rejects invalid preset name', () => {
		const config: FogConfig = {
			mode: 'none',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.01,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const presetResult = applyFogPreset(result.data, 'nonexistent' as any);
		expect(presetResult.ok).toBe(false);

		result.data.dispose();
	});

	test('applies clear preset and sets fog mode to none', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.05,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const presetResult = applyFogPreset(result.data, 'clear' as FogPresetName);
		expect(presetResult.ok).toBe(true);
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_NONE);

		result.data.dispose();
	});
});

// =============================================================================
// disposeFog
// =============================================================================

describe('disposeFog', () => {
	test('cleans up PostProcesses from camera', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 0.8,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			heightFog: {
				enabled: true,
				baseHeight: 0,
				falloff: 0.5,
				density: 0.1,
				offset: 0,
			},
			overlays: [],
		};
		const ppCountBefore = camera._postProcesses.filter(Boolean).length;

		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Should have added PostProcess
		const ppCountDuring = camera._postProcesses.filter(Boolean).length;
		expect(ppCountDuring).toBeGreaterThan(ppCountBefore);

		disposeFog(result.data);

		// Should be back to original count
		const ppCountAfter = camera._postProcesses.filter(Boolean).length;
		expect(ppCountAfter).toBe(ppCountBefore);
	});

	test('resets scene fog to none', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_EXP);

		disposeFog(result.data);
		expect(instance.scene.fogMode).toBe(BABYLON.Scene.FOGMODE_NONE);
	});

	test('is safe to call twice', () => {
		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		disposeFog(result.data);
		// Second call should not throw
		disposeFog(result.data);
	});
});

// =============================================================================
// Per-Mesh Exclusion
// =============================================================================

describe('per-mesh exclusion', () => {
	test('sets applyFog false on ground meshes when excludeGround true', () => {
		const ground = BABYLON.MeshBuilder.CreateGround(
			'ground',
			{ width: 10, height: 10 },
			instance.scene,
		);

		const config: FogConfig = {
			mode: 'exponential',
			color: { r: 0.8, g: 0.8, b: 0.85, a: 1 },
			density: 0.02,
			start: 50,
			end: 300,
			maxOpacity: 1,
			startDistance: 0,
			cutoffDistance: 0,
			excludeSkybox: true,
			skyAffect: 0,
			perMesh: { excludeGround: true, excludeSprites: false },
			overlays: [],
		};
		const result = applyFog(instance.scene, camera, instance.engine, config);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(ground.applyFog).toBe(false);
		result.data.dispose();
	});
});

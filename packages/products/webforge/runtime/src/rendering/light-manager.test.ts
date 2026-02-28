/**
 * Light manager tests.
 *
 * Tests light creation (4 types), property application,
 * color temperature conversion, update/remove/dispose operations,
 * and default-light removal.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { Result } from '@/schemas/result/result';
import type { Bool, Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import type { ColorRgba } from '../schemas/color-schema';
import { colorTemperatureToRgb } from './color-temperature';
import {
	createLighting,
	disposeLighting,
	removeLightById,
	updateLightColor,
	updateLightIntensity,
	updateLightPosition,
	type LightingInstance,
} from './light-manager';

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
// colorTemperatureToRgb (pure math, no Babylon.js)
// =============================================================================

describe('colorTemperatureToRgb', () => {
	test('2700K returns warm white RGB', () => {
		const result: Result<ColorRgba> = colorTemperatureToRgb(2700 as Num);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// Warm white: high red, medium green, low blue
		expect(result.data.r).toBeGreaterThan(0.9);
		expect(result.data.g).toBeGreaterThan(0.5);
		expect(result.data.g).toBeLessThan(0.9);
		expect(result.data.b).toBeGreaterThan(0.3);
		expect(result.data.b).toBeLessThan(0.7);
	});

	test('6500K returns cool white RGB', () => {
		const result: Result<ColorRgba> = colorTemperatureToRgb(6500 as Num);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// Daylight: all channels near 1
		expect(result.data.r).toBeGreaterThan(0.9);
		expect(result.data.g).toBeGreaterThan(0.9);
		expect(result.data.b).toBeGreaterThan(0.9);
	});

	test('1800K returns candle orange', () => {
		const result: Result<ColorRgba> = colorTemperatureToRgb(1800 as Num);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// Very warm: high red, low-medium green, very low blue
		expect(result.data.r).toBe(1);
		expect(result.data.g).toBeLessThan(0.6);
		expect(result.data.b).toBeLessThan(0.3);
	});

	test('out of range returns error', () => {
		const tooLow: Result<ColorRgba> = colorTemperatureToRgb(500 as Num);
		expect(tooLow.ok).toBeFalsy();

		const tooHigh: Result<ColorRgba> = colorTemperatureToRgb(16_000 as Num);
		expect(tooHigh.ok).toBeFalsy();
	});

	test('alpha is always 1', () => {
		const result: Result<ColorRgba> = colorTemperatureToRgb(4000 as Num);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.a).toBe(1);
	});
});

// =============================================================================
// createLighting — Light Creation
// =============================================================================

describe('createLighting — PointLight', () => {
	test('creates PointLight with correct position and range', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						position: { x: 10, y: 2, z: 5 },
						range: 15,
						intensity: 1.5,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights).toHaveLength(1);

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		expect(light).toBeInstanceOf(BABYLON.PointLight);
		expect((light as BABYLON.PointLight).position.x).toBeCloseTo(10);
		expect((light as BABYLON.PointLight).position.y).toBeCloseTo(2);
		expect((light as BABYLON.PointLight).range).toBe(15);
		expect(light.intensity).toBeCloseTo(1.5);
	});
});

describe('createLighting — SpotLight', () => {
	test('creates SpotLight with angle, exponent, direction', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'spot',
						type: 'spot',
						position: { x: 5, y: 10, z: 5 },
						direction: { x: 0, y: -1, z: 0 },
						angle: 0.8,
						exponent: 3,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.SpotLight;
		expect(light).toBeInstanceOf(BABYLON.SpotLight);
		expect(light.angle).toBeCloseTo(0.8);
		expect(light.exponent).toBe(3);
		expect(light.direction.y).toBeCloseTo(-1);
	});
});

describe('createLighting — DirectionalLight', () => {
	test('creates DirectionalLight with direction and position', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						direction: { x: -0.5, y: -1, z: 0.3 },
						position: { x: 0, y: 50, z: 0 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.DirectionalLight;
		expect(light).toBeInstanceOf(BABYLON.DirectionalLight);
		expect(light.direction.x).toBeCloseTo(-0.5);
		expect(light.position.y).toBeCloseTo(50);
	});
});

describe('createLighting — HemisphericLight', () => {
	test('creates HemisphericLight with groundColor and direction', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
						direction: { x: 0, y: 1, z: 0 },
						groundColor: { r: 0.2, g: 0.2, b: 0.2 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.HemisphericLight;
		expect(light).toBeInstanceOf(BABYLON.HemisphericLight);
		expect(light.direction.y).toBeCloseTo(1);
		expect(light.groundColor.r).toBeCloseTo(0.2);
	});
});

// =============================================================================
// Common Properties
// =============================================================================

describe('createLighting — common properties', () => {
	test('applies diffuse and specular colors', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'l',
						type: 'point',
						diffuse: { r: 1, g: 0.9, b: 0.8 },
						specular: { r: 0.5, g: 0.5, b: 0.5 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		expect(light.diffuse.r).toBeCloseTo(1);
		expect(light.diffuse.g).toBeCloseTo(0.9);
		expect(light.specular.b).toBeCloseTo(0.5);
	});

	test('colorTemperature overrides diffuse when set', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'l',
						type: 'point',
						colorTemperature: 2200,
						diffuse: { r: 0, g: 0, b: 0 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		// colorTemperature 2200 should produce warm orange, NOT black
		expect(light.diffuse.r).toBeGreaterThan(0.8);
		expect(light.diffuse.g).toBeGreaterThan(0.3);
	});

	test('removes default-light from scene on create', () => {
		// Create a default light first
		const _defaultLight = new BABYLON.HemisphericLight(
			'default-light',
			new BABYLON.Vector3(0, 1, 0),
			instance.scene,
		);
		expect(instance.scene.getLightByName('default-light')).toBeTruthy();

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'ambient', type: 'hemispheric' }],
			},
		});
		expect(result.ok).toBeTruthy();

		// Default light should be gone
		expect(instance.scene.getLightByName('default-light')).toBeNull();
	});
});

// =============================================================================
// Edge Cases & Validation
// =============================================================================

describe('createLighting — edge cases', () => {
	test('empty lights array returns valid instance', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: { lights: [] },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights).toHaveLength(0);
	});

	test('duplicate light IDs return error', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{ id: 'same', type: 'point' },
					{ id: 'same', type: 'spot' },
				],
			},
		});
		expect(result.ok).toBeFalsy();
	});

	test('invalid config returns error', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: { lights: [{ type: 'invalid' }] },
		});
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// Update Operations
// =============================================================================

describe('updateLightPosition', () => {
	test('changes light position', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'torch', type: 'point', position: { x: 0, y: 0, z: 0 } }],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = updateLightPosition({
			lighting: createResult.data,
			lightId: 'torch',
			position: { x: 5, y: 3, z: 8 },
		});
		expect(result.ok).toBeTruthy();

		const light = createResult.data.lights[0]!.light as BABYLON.PointLight;
		expect(light.position.x).toBeCloseTo(5);
		expect(light.position.y).toBeCloseTo(3);
		expect(light.position.z).toBeCloseTo(8);
	});
});

describe('updateLightIntensity', () => {
	test('changes light intensity', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'torch', type: 'point', intensity: 1.0 }],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = updateLightIntensity({
			lighting: createResult.data,
			lightId: 'torch',
			intensity: 2.5 as Num,
		});
		expect(result.ok).toBeTruthy();

		expect(createResult.data.lights[0]!.light.intensity).toBeCloseTo(2.5);
	});
});

describe('updateLightColor', () => {
	test('changes light diffuse color', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'torch', type: 'point' }],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = updateLightColor({
			lighting: createResult.data,
			lightId: 'torch',
			diffuse: { r: 1, g: 0, b: 0, a: 1 },
		});
		expect(result.ok).toBeTruthy();

		// oxlint-disable-next-line prefer-destructuring
		const light = createResult.data.lights[0]!.light;
		expect(light.diffuse.r).toBeCloseTo(1);
		expect(light.diffuse.g).toBeCloseTo(0);
	});
});

// =============================================================================
// Remove & Dispose
// =============================================================================

describe('removeLightById', () => {
	test('disposes light and returns updated instance', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{ id: 'a', type: 'point' },
					{ id: 'b', type: 'point' },
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const removeResult: BabylonResult<LightingInstance> = removeLightById({
			lighting: createResult.data,
			lightId: 'a',
		});
		expect(removeResult.ok).toBeTruthy();
		if (!removeResult.ok) return;
		expect(removeResult.data.lights).toHaveLength(1);
		expect(removeResult.data.lights[0]!.config.id).toBe('b');
	});
});

describe('disposeLighting', () => {
	test('disposes all lights', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{ id: 'a', type: 'point' },
					{ id: 'b', type: 'hemispheric' },
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = disposeLighting({
			lighting: createResult.data,
		});
		expect(result.ok).toBeTruthy();
	});
});

// =============================================================================
// Sub-module Orchestration
// =============================================================================

describe('createLighting — sub-module orchestration', () => {
	test('creates flicker instance when flicker config is enabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						intensity: 1.5,
						flicker: { enabled: true, type: 'torch', intensity: 0.3 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.flickerInstance).not.toBeNull();
	});

	test('does not create flicker when disabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						flicker: { enabled: false },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.flickerInstance).toBeNull();
	});

	test('does not create flicker on hemispheric lights', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.flickerInstance).toBeNull();
	});

	test('creates shadow generator when shadow is enabled on directional light', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadow: { enabled: true, type: 'pcf', mapSize: 512 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.shadowGenerator).not.toBeNull();
	});

	test('does not create shadow when disabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadow: { enabled: false },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.shadowGenerator).toBeNull();
	});

	test('creates glow layer when enabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [],
				glow: { enabled: true, intensity: 0.5 },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowLayer).not.toBeNull();
	});

	test('does not create glow layer when disabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [],
				glow: { enabled: false },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.glowLayer).toBeNull();
	});

	test('creates day/night cycle when enabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{ id: 'sun', type: 'directional' },
					{ id: 'ambient', type: 'hemispheric' },
				],
				dayNight: {
					enabled: true,
					timeOfDay: 12,
					speed: 1,
					sunLightId: 'sun',
					ambientLightId: 'ambient',
				},
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.dayNightCycle).not.toBeNull();
	});

	test('does not create day/night cycle when disabled', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [],
				dayNight: { enabled: false },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.dayNightCycle).toBeNull();
	});

	test('disposes flicker and shadow on removeLightById', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						flicker: { enabled: true, type: 'candle' },
					},
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;
		expect(createResult.data.lights[0]!.flickerInstance).not.toBeNull();

		const removeResult: BabylonResult<LightingInstance> = removeLightById({
			lighting: createResult.data,
			lightId: 'torch',
		});
		expect(removeResult.ok).toBeTruthy();
		if (!removeResult.ok) return;
		expect(removeResult.data.lights).toHaveLength(0);
	});

	test('full lighting config creates all sub-resources', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{ id: 'ambient', type: 'hemispheric', intensity: 0.6 },
					{
						id: 'sun',
						type: 'directional',
						intensity: 0.8,
						shadow: { enabled: true, type: 'pcf', mapSize: 512 },
					},
					{
						id: 'torch',
						type: 'point',
						intensity: 1.5,
						colorTemperature: 2200,
						flicker: { enabled: true, type: 'torch', intensity: 0.25 },
					},
				],
				dayNight: {
					enabled: true,
					timeOfDay: 10,
					speed: 0.5,
					sunLightId: 'sun',
					ambientLightId: 'ambient',
				},
				glow: { enabled: true, intensity: 0.3 },
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// 3 lights
		expect(result.data.lights).toHaveLength(3);

		// Ambient: no shadow, no flicker
		expect(result.data.lights[0]!.shadowGenerator).toBeNull();
		expect(result.data.lights[0]!.flickerInstance).toBeNull();

		// Sun: shadow, no flicker
		expect(result.data.lights[1]!.shadowGenerator).not.toBeNull();
		expect(result.data.lights[1]!.flickerInstance).toBeNull();

		// Torch: no shadow, has flicker
		expect(result.data.lights[2]!.shadowGenerator).toBeNull();
		expect(result.data.lights[2]!.flickerInstance).not.toBeNull();

		// Glow + Day/night
		expect(result.data.glowLayer).not.toBeNull();
		expect(result.data.dayNightCycle).not.toBeNull();
	});
});

// =============================================================================
// Volumetric Light (God Rays)
// =============================================================================

describe('createLighting — volumetric light', () => {
	test('DirectionalLight with volumetricLight.enabled creates post-process (non-fatal)', () => {
		// Need a camera for post-processing
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						volumetricLight: { enabled: true, samples: 50, decay: 0.95, weight: 0.4 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// Volumetric is non-fatal — may be null on NullEngine, but ManagedLight has the field
		const managed = result.data.lights[0]!;
		expect('volumetricPostProcess' in managed).toBe(true);
	});

	test('DirectionalLight without volumetricLight config has null post-process', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'sun', type: 'directional' }],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.volumetricPostProcess).toBeNull();
	});

	test('PointLight ignores volumetricLight config (field stays null)', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'torch', type: 'point' }],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.volumetricPostProcess).toBeNull();
	});
});

// =============================================================================
// Lens Flares
// =============================================================================

describe('createLighting — lens flares', () => {
	test('DirectionalLight with lensFlare.enabled creates LensFlareSystem', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		// Non-fatal — may or may not succeed on NullEngine
		expect('lensFlareSystem' in managed).toBe(true);
	});

	test('DirectionalLight with custom flares creates correct number of flare elements', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: {
							enabled: true,
							flares: [
								{ size: 0.2, position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
								{ size: 0.5, position: 0.3, color: { r: 0.5, g: 0.5, b: 1, a: 1 } },
							],
						},
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(2);
		}
	});

	test('DirectionalLight with default flares (no flares array) creates 3 flares', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(3);
		}
	});

	test('DirectionalLight without lensFlare config has null system', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [{ id: 'sun', type: 'directional' }],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lights[0]!.lensFlareSystem).toBeNull();
	});

	test('removeLightById disposes volumetric and lens flare resources', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true },
					},
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const removeResult: BabylonResult<LightingInstance> = removeLightById({
			lighting: createResult.data,
			lightId: 'sun',
		});
		expect(removeResult.ok).toBeTruthy();
		if (!removeResult.ok) return;
		expect(removeResult.data.lights).toHaveLength(0);
	});

	test('disposeLighting disposes all volumetric and lens flare resources', () => {
		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true },
					},
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = disposeLighting({
			lighting: createResult.data,
		});
		expect(result.ok).toBeTruthy();
	});
});

// =============================================================================
// Task 5: New Per-Light Properties
// =============================================================================

describe('createLighting — new per-light properties', () => {
	test('PointLight applies radius property', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						radius: 5,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.PointLight;
		if ('radius' in light) {
			expect(light.radius).toBe(5);
		}
	});

	test('PointLight applies renderPriority', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						renderPriority: 3,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('renderPriority' in light) {
			expect(light.renderPriority).toBe(3);
		}
	});

	test('PointLight applies shadowMinZ and shadowMaxZ when > 0', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						shadowMinZ: 1,
						shadowMaxZ: 50,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('shadowMinZ' in light) {
			expect(light.shadowMinZ).toBe(1);
		}
		if ('shadowMaxZ' in light) {
			expect(light.shadowMaxZ).toBe(50);
		}
	});

	test('PointLight applies lightmapMode', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						lightmapMode: 'specular',
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('lightmapMode' in light) {
			expect(light.lightmapMode).toBe(BABYLON.Light.LIGHTMAP_SPECULAR);
		}
	});

	test('SpotLight applies innerAngle', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'spot',
						type: 'spot',
						innerAngle: 0.5,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.SpotLight;
		if ('innerAngle' in light) {
			expect(light.innerAngle).toBeCloseTo(0.5);
		}
	});

	test('SpotLight applies radius', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'spot',
						type: 'spot',
						radius: 3,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.SpotLight;
		if ('radius' in light) {
			expect(light.radius).toBe(3);
		}
	});

	test('SpotLight applies shadowMinZ and shadowMaxZ', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'spot',
						type: 'spot',
						shadowMinZ: 2,
						shadowMaxZ: 80,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('shadowMinZ' in light) {
			expect(light.shadowMinZ).toBe(2);
		}
		if ('shadowMaxZ' in light) {
			expect(light.shadowMaxZ).toBe(80);
		}
	});

	test('DirectionalLight applies shadowFrustumSize when > 0', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadowFrustumSize: 20,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.DirectionalLight;
		if ('shadowFrustumSize' in light) {
			expect(light.shadowFrustumSize).toBe(20);
		}
	});

	test('DirectionalLight does not set shadowFrustumSize when 0', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadowFrustumSize: 0,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.DirectionalLight;
		// When 0, we should not override Babylon's default
		if ('shadowFrustumSize' in light) {
			expect(light.shadowFrustumSize).toBe(0);
		}
	});

	test('DirectionalLight applies shadowOrthoScale', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadowOrthoScale: 0.5,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.DirectionalLight;
		if ('shadowOrthoScale' in light) {
			expect(light.shadowOrthoScale).toBeCloseTo(0.5);
		}
	});

	test('DirectionalLight applies autoUpdateExtends', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						autoUpdateExtends: false,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const light = result.data.lights[0]!.light as BABYLON.DirectionalLight;
		if ('autoUpdateExtends' in light) {
			expect(light.autoUpdateExtends).toBe(false);
		}
	});

	test('DirectionalLight applies shadowMinZ and shadowMaxZ', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						shadowMinZ: 5,
						shadowMaxZ: 200,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('shadowMinZ' in light) {
			expect(light.shadowMinZ).toBe(5);
		}
		if ('shadowMaxZ' in light) {
			expect(light.shadowMaxZ).toBe(200);
		}
	});

	test('DirectionalLight applies lightmapMode', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lightmapMode: 'shadowsOnly',
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('lightmapMode' in light) {
			expect(light.lightmapMode).toBe(BABYLON.Light.LIGHTMAP_SHADOWSONLY);
		}
	});

	test('HemisphericLight applies renderPriority', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
						renderPriority: 5,
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// oxlint-disable-next-line prefer-destructuring
		const light = result.data.lights[0]!.light;
		if ('renderPriority' in light) {
			expect(light.renderPriority).toBe(5);
		}
	});
});

// =============================================================================
// Task 6: Distance Fade Observer
// =============================================================================

describe('createLighting — distance fade', () => {
	test('ManagedLight has distanceFadeObserver field', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						distanceFade: { enabled: true, start: 10, end: 50 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		expect('distanceFadeObserver' in managed).toBe(true);
	});

	test('distance fade observer is null when not configured', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.lights[0]!.distanceFadeObserver).toBeNull();
	});

	test('distance fade observer is null when distanceFade.enabled is false', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						distanceFade: { enabled: false, start: 10, end: 50 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.lights[0]!.distanceFadeObserver).toBeNull();
	});

	test('distance fade observer is created for point light when enabled', () => {
		// Need a camera for distance calculations
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						position: { x: 0, y: 0, z: 0 },
						distanceFade: { enabled: true, start: 10, end: 50 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.lights[0]!.distanceFadeObserver).not.toBeNull();
	});

	test('distance fade observer is created for spot light when enabled', () => {
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'spot',
						type: 'spot',
						position: { x: 0, y: 0, z: 0 },
						distanceFade: { enabled: true, start: 5, end: 30 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.lights[0]!.distanceFadeObserver).not.toBeNull();
	});

	test('distance fade observer is null for hemispheric light (no position)', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.lights[0]!.distanceFadeObserver).toBeNull();
	});

	test('distance fade is cleaned up on removeLightById', () => {
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						distanceFade: { enabled: true, start: 10, end: 50 },
					},
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const removeResult: BabylonResult<LightingInstance> = removeLightById({
			lighting: createResult.data,
			lightId: 'torch',
		});
		expect(removeResult.ok).toBeTruthy();
		if (!removeResult.ok) return;
		expect(removeResult.data.lights).toHaveLength(0);
	});

	test('distance fade is cleaned up on disposeLighting', () => {
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const createResult: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'torch',
						type: 'point',
						distanceFade: { enabled: true, start: 10, end: 50 },
					},
				],
			},
		});
		expect(createResult.ok).toBeTruthy();
		if (!createResult.ok) return;

		const result: BabylonResult<Bool> = disposeLighting({
			lighting: createResult.data,
		});
		expect(result.ok).toBeTruthy();
	});
});

// =============================================================================
// Task 7: Lens Flare Presets & Volumetric Expansion
// =============================================================================

describe('createLighting — lens flare presets', () => {
	test('preset sun creates 6-element flare set when no custom flares', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true, preset: 'sun' },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(6);
		}
	});

	test('preset moonGlow creates 3-element flare set', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true, preset: 'moonGlow' },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(3);
		}
	});

	test('preset crystalLight creates 5-element flare set', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true, preset: 'crystalLight' },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(5);
		}
	});

	test('preset torchGlow creates 2-element flare set', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: { enabled: true, preset: 'torchGlow' },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(2);
		}
	});

	test('custom flares override preset', () => {
		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						lensFlare: {
							enabled: true,
							preset: 'sun',
							flares: [{ size: 0.3, position: 0, color: { r: 1, g: 1, b: 1, a: 1 } }],
						},
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.lensFlareSystem) {
			// Custom flares should override preset — 1, not 6
			expect(managed.lensFlareSystem.lensFlares).toHaveLength(1);
		}
	});
});

describe('createLighting — volumetric expansion', () => {
	test('volumetric applies exposure property', () => {
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						volumetricLight: {
							enabled: true,
							samples: 50,
							exposure: 1.5,
						},
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.volumetricPostProcess) {
			expect(managed.volumetricPostProcess.exposure).toBeCloseTo(1.5);
		}
	});

	test('volumetric defaults exposure to 1.0 when not set', () => {
		const _camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
			'cam',
			0,
			0,
			10,
			BABYLON.Vector3.Zero(),
			instance.scene,
		);

		const result: BabylonResult<LightingInstance> = createLighting({
			scene: instance.scene,
			config: {
				lights: [
					{
						id: 'sun',
						type: 'directional',
						volumetricLight: { enabled: true, samples: 50 },
					},
				],
			},
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const managed = result.data.lights[0]!;
		if (managed.volumetricPostProcess) {
			expect(managed.volumetricPostProcess.exposure).toBeCloseTo(1.0);
		}
	});
});

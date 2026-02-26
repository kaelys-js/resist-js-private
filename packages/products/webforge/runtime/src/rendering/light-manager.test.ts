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
import type { ColorRgba } from '../schemas/scene-setup-config';
import {
	colorTemperatureToRgb,
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

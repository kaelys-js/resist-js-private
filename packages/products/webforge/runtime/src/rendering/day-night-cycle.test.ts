/**
 * Day/night cycle tests.
 *
 * Tests keyframe interpolation (pure math), sun path computation (pure math),
 * cycle engine (NullEngine), time control, and observer lifecycle.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { ManagedLight } from './light-manager';
import { applySceneSetup } from './scene-setup';
import {
	DEFAULT_DAY_CYCLE_KEYFRAMES,
	computeSunDirection,
	createDayNightCycle,
	disposeDayNightCycle,
	getTimeOfDay,
	interpolateKeyframes,
	setTimeOfDay,
} from './day-night-cycle';

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
// interpolateKeyframes — pure math
// =============================================================================

describe('interpolateKeyframes', () => {
	test('midpoint between two keyframes returns averaged values', () => {
		const keyframes = [
			{
				time: 6,
				sunIntensity: 0,
				ambientColor: { r: 0, g: 0, b: 0, a: 1 },
			},
			{
				time: 12,
				sunIntensity: 1,
				ambientColor: { r: 1, g: 1, b: 1, a: 1 },
			},
		];
		const result = interpolateKeyframes(keyframes, 9);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.sunIntensity).toBeCloseTo(0.5, 2);
		expect(result.data.ambientColor?.r).toBeCloseTo(0.5, 2);
		expect(result.data.ambientColor?.g).toBeCloseTo(0.5, 2);
		expect(result.data.ambientColor?.b).toBeCloseTo(0.5, 2);
	});

	test('exact keyframe time returns that keyframe values', () => {
		const keyframes = [
			{ time: 6, sunIntensity: 0.5 },
			{ time: 12, sunIntensity: 1.0 },
		];
		const result = interpolateKeyframes(keyframes, 6);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.sunIntensity).toBeCloseTo(0.5, 2);
	});

	test('midnight wrap-around interpolates correctly', () => {
		const keyframes = [
			{ time: 0, sunIntensity: 0 },
			{ time: 22, sunIntensity: 0.3 },
		];
		// 23 is between 22 and 0 (next day), fraction = 0.5
		const result = interpolateKeyframes(keyframes, 23);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// 0.3 → 0.0: midpoint = 0.15
		expect(result.data.sunIntensity).toBeCloseTo(0.15, 2);
	});

	test('only fields present in BOTH keyframes are interpolated', () => {
		const keyframes = [
			{ time: 6, sunIntensity: 0.5 },
			{ time: 12, fogDensity: 0.8 },
		];
		const result = interpolateKeyframes(keyframes, 9);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// sunIntensity only in first, fogDensity only in second — neither interpolated
		expect(result.data.sunIntensity).toBeUndefined();
		expect(result.data.fogDensity).toBeUndefined();
	});

	test('environmentIntensity interpolated correctly', () => {
		const keyframes = [
			{ time: 6, environmentIntensity: 0.1 },
			{ time: 12, environmentIntensity: 0.6 },
		];
		const result = interpolateKeyframes(keyframes, 9);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.environmentIntensity).toBeCloseTo(0.35, 2);
	});

	test('color lerp produces correct midpoint values', () => {
		const keyframes = [
			{
				time: 0,
				clearColor: { r: 0, g: 0, b: 0, a: 1 },
			},
			{
				time: 12,
				clearColor: { r: 1, g: 0.5, b: 0.2, a: 1 },
			},
		];
		const result = interpolateKeyframes(keyframes, 6);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.clearColor?.r).toBeCloseTo(0.5, 2);
		expect(result.data.clearColor?.g).toBeCloseTo(0.25, 2);
		expect(result.data.clearColor?.b).toBeCloseTo(0.1, 2);
	});
});

// =============================================================================
// computeSunDirection — pure math
// =============================================================================

describe('computeSunDirection', () => {
	const defaultPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 90 };

	test('noon returns near-vertical direction (strong negative Y)', () => {
		const result = computeSunDirection(12, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// At noon, sun should be high → large negative Y
		expect(result.data.y).toBeLessThan(-0.5);
	});

	test('sunrise returns near-horizontal from east', () => {
		const result = computeSunDirection(6.01, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// Near sunrise, Y should be near 0 (near horizon)
		expect(Math.abs(result.data.y)).toBeLessThan(0.3);
	});

	test('sunset returns near-horizontal from west', () => {
		const result = computeSunDirection(17.99, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// Near sunset, Y should be near 0 (near horizon)
		expect(Math.abs(result.data.y)).toBeLessThan(0.3);
	});

	test('before sunrise returns zero vector', () => {
		const result = computeSunDirection(4, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.x).toBe(0);
		expect(result.data.y).toBe(0);
		expect(result.data.z).toBe(0);
	});

	test('after sunset returns zero vector', () => {
		const result = computeSunDirection(20, defaultPath);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.x).toBe(0);
		expect(result.data.y).toBe(0);
		expect(result.data.z).toBe(0);
	});

	test('maxElevation=90 noon direction is near {0, -1, 0}', () => {
		const path = { sunrise: 6, sunset: 18, maxElevation: 90, azimuthStart: 90 };
		const result = computeSunDirection(12, path);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.y).toBeCloseTo(-1, 1);
		expect(Math.abs(result.data.x)).toBeLessThan(0.15);
		expect(Math.abs(result.data.z)).toBeLessThan(0.15);
	});

	test('azimuthStart=270 (west) rotates sun path', () => {
		const westPath = { sunrise: 6, sunset: 18, maxElevation: 75, azimuthStart: 270 };
		const eastResult = computeSunDirection(7, defaultPath);
		const westResult = computeSunDirection(7, westPath);
		expect(eastResult.ok).toBeTruthy();
		expect(westResult.ok).toBeTruthy();
		if (!eastResult.ok || !westResult.ok) return;

		// Different azimuth start should produce different X/Z values
		expect(eastResult.data.x).not.toBeCloseTo(westResult.data.x, 1);
	});
});

// =============================================================================
// Cycle Engine — NullEngine integration
// =============================================================================

describe('createDayNightCycle', () => {
	test('creates observer on scene', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0 },
			managedLights: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.observer).toBeDefined();
	});

	test('missing sunLightId gracefully results in null sun', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0, sunLightId: 'nonexistent' },
			managedLights: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.sunLight).toBeNull();
	});

	test('resolves sun light from managed lights by ID', () => {
		const sunLight: BABYLON.DirectionalLight = new BABYLON.DirectionalLight(
			'sun',
			new BABYLON.Vector3(0, -1, 0),
			instance.scene,
		);
		const managedLights: readonly ManagedLight[] = [
			{
				config: {
					id: 'sun',
					type: 'directional',
					enabled: true,
					intensity: 1,
					diffuse: { r: 1, g: 1, b: 1, a: 1 },
					specular: { r: 1, g: 1, b: 1, a: 1 },
					falloffType: 'default',
					intensityMode: 'automatic',
					direction: { x: 0, y: -1, z: 0 },
					position: { x: 0, y: 50, z: 0 },
					autoCalcShadowZBounds: true,
				},
				light: sunLight,
			},
		];

		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0, sunLightId: 'sun' },
			managedLights,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.sunLight).toBe(sunLight);
	});

	test('uses default keyframes when none provided', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0 },
			managedLights: [],
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.keyframes.length).toBe(DEFAULT_DAY_CYCLE_KEYFRAMES.length);
	});
});

// =============================================================================
// Time Control
// =============================================================================

describe('setTimeOfDay / getTimeOfDay', () => {
	test('setTimeOfDay jumps to specified time', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const setResult = setTimeOfDay(result.data, 18);
		expect(setResult.ok).toBeTruthy();

		const getResult = getTimeOfDay(result.data);
		expect(getResult.ok).toBeTruthy();
		if (!getResult.ok) return;
		expect(getResult.data).toBeCloseTo(18, 2);
	});

	test('getTimeOfDay returns initial time', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 10, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const getResult = getTimeOfDay(result.data);
		expect(getResult.ok).toBeTruthy();
		if (!getResult.ok) return;
		expect(getResult.data).toBeCloseTo(10, 2);
	});
});

// =============================================================================
// Dispose
// =============================================================================

describe('disposeDayNightCycle', () => {
	test('removes observer from scene', () => {
		const result = createDayNightCycle({
			scene: instance.scene,
			config: { enabled: true, timeOfDay: 12, speed: 0 },
			managedLights: [],
		});
		if (!result.ok) throw new Error('Failed to create cycle');

		const disposeResult = disposeDayNightCycle({ cycle: result.data, scene: instance.scene });
		expect(disposeResult.ok).toBeTruthy();
	});
});

// =============================================================================
// DEFAULT_DAY_CYCLE_KEYFRAMES
// =============================================================================

describe('DEFAULT_DAY_CYCLE_KEYFRAMES', () => {
	test('has 9 keyframes', () => {
		expect(DEFAULT_DAY_CYCLE_KEYFRAMES).toHaveLength(9);
	});

	test('keyframes are sorted by time', () => {
		for (let i = 1; i < DEFAULT_DAY_CYCLE_KEYFRAMES.length; i++) {
			const current: number | undefined = DEFAULT_DAY_CYCLE_KEYFRAMES[i]?.time;
			const previous: number | undefined = DEFAULT_DAY_CYCLE_KEYFRAMES[i - 1]?.time;
			expect(current).toBeDefined();
			expect(previous).toBeDefined();
			if (current !== undefined && previous !== undefined) {
				expect(current).toBeGreaterThanOrEqual(previous);
			}
		}
	});

	test('first keyframe is at midnight (0)', () => {
		const [first] = DEFAULT_DAY_CYCLE_KEYFRAMES;
		expect(first).toBeDefined();
		expect(first?.time).toBe(0);
	});
});

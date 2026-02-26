/**
 * Light animation (flicker) tests.
 *
 * Tests the 7 flicker presets (candle, torch, campfire, pulse, strobe,
 * breathing, fluorescent), color shift, position jitter, pseudoNoise,
 * and observer lifecycle.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import { applySceneSetup } from './scene-setup';
import {
	computeColorShift,
	computeFlicker,
	computePositionJitter,
	createFlicker,
	disposeFlicker,
	pseudoNoise,
} from './light-animation';

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
// pseudoNoise
// =============================================================================

describe('pseudoNoise', () => {
	test('is deterministic', () => {
		const a: number = pseudoNoise(42);
		const b: number = pseudoNoise(42);
		expect(a).toBe(b);
	});

	test('returns value in [0, 1)', () => {
		for (let i = 0; i < 100; i++) {
			const val: number = pseudoNoise(i * 7.31);
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThan(1);
		}
	});

	test('different seeds produce different values', () => {
		const a: number = pseudoNoise(1);
		const b: number = pseudoNoise(2);
		expect(a).not.toBe(b);
	});
});

// =============================================================================
// computeFlicker — 7 types
// =============================================================================

describe('computeFlicker', () => {
	const types = [
		'candle',
		'torch',
		'campfire',
		'pulse',
		'strobe',
		'breathing',
		'fluorescent',
	] as const;

	for (const type of types) {
		test(`${type} returns value in [1-amplitude, 1] over many samples`, () => {
			const amplitude = 0.3;
			const speed = 1.0;
			for (let t = 0; t < 10; t += 0.01) {
				const val: number = computeFlicker(type, t, speed, amplitude);
				expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
				expect(val).toBeLessThanOrEqual(1.001);
			}
		});
	}

	test('amplitude=0 always returns 1', () => {
		for (let t = 0; t < 5; t += 0.1) {
			expect(computeFlicker('candle', t, 1, 0)).toBeCloseTo(1, 5);
		}
	});

	test('pulse at known time returns expected value', () => {
		// pulse: 1 - amp * (0.5 + 0.5 * sin(t * speed * 2 * PI))
		// At t=0, sin(0) = 0, so result = 1 - 0.3 * (0.5 + 0) = 1 - 0.15 = 0.85
		const val: number = computeFlicker('pulse', 0, 1, 0.3);
		expect(val).toBeCloseTo(0.85, 2);
	});

	test('strobe returns binary output', () => {
		const amplitude = 0.5;
		const values: Set<number> = new Set<number>();
		for (let t = 0; t < 2; t += 0.001) {
			values.add(Math.round(computeFlicker('strobe', t, 1, amplitude) * 1000) / 1000);
		}
		// Strobe should only produce two values: 1 and (1-amplitude)
		expect(values.size).toBeLessThanOrEqual(2);
	});
});

// =============================================================================
// computeColorShift
// =============================================================================

describe('computeColorShift', () => {
	test('at full brightness returns base temperature color', () => {
		// flickerMultiplier = 1 means full brightness
		const result = computeColorShift(2700, 1, 200);
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// At full brightness, shift = 0, so color = colorTemperatureToRgb(2700)
		expect(result.data.r).toBeGreaterThan(0.5);
	});

	test('when dim returns warmer color (lower Kelvin)', () => {
		// flickerMultiplier = 0.7 means dimmer
		const fullResult = computeColorShift(2700, 1, 200);
		const dimResult = computeColorShift(2700, 0.7, 200);
		expect(fullResult.ok).toBeTruthy();
		expect(dimResult.ok).toBeTruthy();
		if (!fullResult.ok || !dimResult.ok) return;

		// Warmer = more red relative to blue
		// dimResult should be warmer (shifted toward lower Kelvin)
		// Lower Kelvin → relatively more red, less blue
		expect(dimResult.data.b).toBeLessThanOrEqual(fullResult.data.b + 0.01);
	});

	test('colorShiftRange=0 produces same color regardless of multiplier', () => {
		const a = computeColorShift(2700, 1, 0);
		const b = computeColorShift(2700, 0.5, 0);
		expect(a.ok).toBeTruthy();
		expect(b.ok).toBeTruthy();
		if (!a.ok || !b.ok) return;

		expect(a.data.r).toBeCloseTo(b.data.r, 3);
		expect(a.data.g).toBeCloseTo(b.data.g, 3);
		expect(a.data.b).toBeCloseTo(b.data.b, 3);
	});
});

// =============================================================================
// computePositionJitter
// =============================================================================

describe('computePositionJitter', () => {
	test('returns offset within radius', () => {
		const base = { x: 10, y: 5, z: 10 };
		const radius = 0.5;

		for (let t = 0; t < 5; t += 0.1) {
			const jittered = computePositionJitter(base, radius, t);
			const dx: number = jittered.x - base.x;
			const dy: number = jittered.y - base.y;
			const dz: number = jittered.z - base.z;
			// Each component should be within [-radius, radius]
			expect(Math.abs(dx)).toBeLessThanOrEqual(radius + 0.001);
			expect(Math.abs(dy)).toBeLessThanOrEqual(radius + 0.001);
			expect(Math.abs(dz)).toBeLessThanOrEqual(radius + 0.001);
		}
	});

	test('radius=0 returns base position', () => {
		const base = { x: 1, y: 2, z: 3 };
		const result = computePositionJitter(base, 0, 5);
		expect(result.x).toBe(base.x);
		expect(result.y).toBe(base.y);
		expect(result.z).toBe(base.z);
	});

	test('is deterministic for same time', () => {
		const base = { x: 0, y: 0, z: 0 };
		const a = computePositionJitter(base, 1, 42);
		const b = computePositionJitter(base, 1, 42);
		expect(a.x).toBe(b.x);
		expect(a.y).toBe(b.y);
		expect(a.z).toBe(b.z);
	});
});

// =============================================================================
// createFlicker / disposeFlicker (Babylon.js integration)
// =============================================================================

describe('createFlicker', () => {
	test('registers observer on scene', () => {
		const light: BABYLON.PointLight = new BABYLON.PointLight(
			'flicker-light',
			new BABYLON.Vector3(0, 5, 0),
			instance.scene,
		);
		light.intensity = 2;

		const result = createFlicker({
			scene: instance.scene,
			light,
			config: { enabled: true, type: 'candle', intensity: 0.3, speed: 1 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.observer).toBeDefined();
		expect(result.data.baseIntensity).toBe(2);
	});

	test('stores base values', () => {
		const light: BABYLON.PointLight = new BABYLON.PointLight(
			'flicker-light',
			new BABYLON.Vector3(5, 10, 15),
			instance.scene,
		);
		light.intensity = 3;
		light.diffuse = new BABYLON.Color3(1, 0.8, 0.6);

		const result = createFlicker({
			scene: instance.scene,
			light,
			config: { enabled: true, type: 'torch', intensity: 0.2, speed: 1 },
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		expect(result.data.baseIntensity).toBe(3);
		expect(result.data.baseDiffuse.r).toBeCloseTo(1);
		expect(result.data.baseDiffuse.g).toBeCloseTo(0.8);
		expect(result.data.baseDiffuse.b).toBeCloseTo(0.6);
	});
});

describe('disposeFlicker', () => {
	test('removes observer and restores base intensity', () => {
		const light: BABYLON.PointLight = new BABYLON.PointLight(
			'flicker-light',
			new BABYLON.Vector3(0, 5, 0),
			instance.scene,
		);
		light.intensity = 2;

		const createResult = createFlicker({
			scene: instance.scene,
			light,
			config: { enabled: true, type: 'candle', intensity: 0.3, speed: 1 },
		});
		if (!createResult.ok) throw new Error('Failed to create flicker');

		const disposeResult = disposeFlicker({ flicker: createResult.data, scene: instance.scene });
		expect(disposeResult.ok).toBeTruthy();
		// Intensity should be restored to base
		expect(light.intensity).toBe(2);
	});
});

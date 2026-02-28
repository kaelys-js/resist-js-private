/**
 * Light animation (flicker) tests.
 *
 * Tests the 13 flicker presets (candle, torch, campfire, pulse, strobe,
 * breathing, fluorescent, storm, heartbeat, random, neon, dying, siren),
 * color shift, position jitter, pseudoNoise, and observer lifecycle.
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
		'storm',
		'heartbeat',
		'random',
		'neon',
		'dying',
		'siren',
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

	test('amplitude=0 always returns 1 for all types', () => {
		for (const type of types) {
			for (let t = 0; t < 5; t += 0.1) {
				expect(computeFlicker(type, t, 1, 0)).toBeCloseTo(1, 5);
			}
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

	test('storm has mostly dimmed rumble with occasional bright flashes', () => {
		const amplitude = 0.5;
		let flashCount = 0;
		const total = 1000;
		for (let t = 0; t < 10; t += 10 / total) {
			const val: number = computeFlicker('storm', t, 1, amplitude);
			// Must stay in valid range
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			if (val > 0.95) flashCount++;
		}
		// Storm should have some flash moments but not constantly bright
		expect(flashCount).toBeGreaterThan(0);
		expect(flashCount).toBeLessThan(total * 0.3);
	});

	test('heartbeat has double-pulse pattern', () => {
		const amplitude = 0.5;
		// Sample one complete cycle at speed=1 (period = 1/1.2 ≈ 0.833s)
		const cycleDuration = 1 / 1.2;
		const samples: number[] = [];
		for (let t = 0; t < cycleDuration; t += cycleDuration / 200) {
			samples.push(computeFlicker('heartbeat', t, 1, amplitude));
		}
		// Find peaks (local maxima significantly above baseline)
		let peakCount = 0;
		for (let i = 1; i < samples.length - 1; i++) {
			const curr: number | undefined = samples[i];
			const prev: number | undefined = samples[i - 1];
			const next: number | undefined = samples[i + 1];
			if (
				curr !== undefined &&
				prev !== undefined &&
				next !== undefined &&
				curr > prev &&
				curr > next &&
				curr > 1 - amplitude + 0.05
			) {
				peakCount++;
			}
		}
		// Should have at least 2 peaks in one cycle (the double beat)
		expect(peakCount).toBeGreaterThanOrEqual(2);
	});

	test('random varies each frame', () => {
		const amplitude = 0.5;
		const values: Set<number> = new Set<number>();
		for (let t = 0; t < 1; t += 0.01) {
			const val: number = computeFlicker('random', t, 1, amplitude);
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			values.add(Math.round(val * 1000) / 1000);
		}
		// Random should produce many distinct values over 100 samples
		expect(values.size).toBeGreaterThan(10);
	});

	test('neon is mostly on with rare dips', () => {
		const amplitude = 0.5;
		let fullOnCount = 0;
		const total = 1000;
		for (let t = 0; t < 10; t += 10 / total) {
			const val: number = computeFlicker('neon', t, 1, amplitude);
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			if (val > 0.99) fullOnCount++;
		}
		// Neon should be fully on >90% of the time (threshold is 0.03)
		expect(fullOnCount).toBeGreaterThan(total * 0.9);
	});

	test('dying tends toward longer off periods', () => {
		const amplitude = 0.8;
		// Sample early in cycle vs late in cycle
		let earlyOnCount = 0;
		let lateOnCount = 0;
		const samplesPerSegment = 200;
		// Early in cycle (cycle value near 0 → onChance high)
		for (let i = 0; i < samplesPerSegment; i++) {
			const t: number = i * 0.001; // Very small t → cycle ≈ 0
			const val: number = computeFlicker('dying', t, 1, amplitude);
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			if (val > 1 - amplitude + 0.01) earlyOnCount++;
		}
		// Late in cycle (larger t → cycle approaches 1 → onChance drops)
		for (let i = 0; i < samplesPerSegment; i++) {
			const t: number = 2.5 + i * 0.001; // Larger t → cycle further along
			const val: number = computeFlicker('dying', t, 1, amplitude);
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			if (val > 1 - amplitude + 0.01) lateOnCount++;
		}
		// Early should have more "on" frames than late (dying effect)
		expect(earlyOnCount).toBeGreaterThanOrEqual(lateOnCount);
	});

	test('siren returns binary output oscillating at ~2Hz', () => {
		const amplitude = 0.5;
		const values: Set<number> = new Set<number>();
		for (let t = 0; t < 2; t += 0.001) {
			const val: number = computeFlicker('siren', t, 1, amplitude);
			expect(val).toBeGreaterThanOrEqual(1 - amplitude - 0.001);
			expect(val).toBeLessThanOrEqual(1.001);
			values.add(Math.round(val * 1000) / 1000);
		}
		// Siren should only produce two values: 1 and (1-amplitude)
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

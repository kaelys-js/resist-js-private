/**
 * Camera controller tests.
 *
 * Tests HD-2D camera creation in both editor and gameplay modes,
 * mode-dependent defaults, and smooth follow target update logic.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import { createHd2dCamera, updateCameraTarget } from './camera-controller';

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
// Editor Mode
// =============================================================================

describe('createHd2dCamera — editor mode', () => {
	test('creates ArcRotateCamera with HD-2D defaults', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		expect(result.data.alpha).toBeCloseTo(Math.PI / 4);
		expect(result.data.beta).toBeCloseTo(Math.PI / 4);
		expect(result.data.radius).toBe(100);
	});

	test('applies beta limits', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerBetaLimit).toBeCloseTo(Math.PI / 6);
		expect(result.data.upperBetaLimit).toBeCloseTo(Math.PI / 2.5);
	});

	test('applies radius limits', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerRadiusLimit).toBe(30);
		expect(result.data.upperRadiusLimit).toBe(300);
	});

	test('restricts panning to XZ plane', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningAxis.y).toBe(0);
	});

	test('allows free orbit (no alpha limits)', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// null means unlimited
		expect(result.data.lowerAlphaLimit).toBeNull();
		expect(result.data.upperAlphaLimit).toBeNull();
	});

	test('applies zero inertia for immediate response', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('applies panning sensibility for editor', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(50);
	});
});

// =============================================================================
// Gameplay Mode
// =============================================================================

describe('createHd2dCamera — gameplay mode', () => {
	test('locks alpha to initial value', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(result.data.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('locks beta to initial value', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.lowerBetaLimit).toBeCloseTo(Math.PI / 4);
		expect(result.data.upperBetaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('applies momentum inertia (0.7)', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.7);
	});

	test('disables panning', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(0);
	});
});

// =============================================================================
// Explicit Overrides
// =============================================================================

describe('createHd2dCamera — explicit overrides', () => {
	test('explicit inertia overrides mode default', () => {
		const result = createHd2dCamera(instance.scene, {
			mode: 'editor',
			inertia: 0.5,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.5);
	});

	test('explicit panningSensibility overrides mode default', () => {
		const result = createHd2dCamera(instance.scene, {
			mode: 'gameplay',
			panningSensibility: 75,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.panningSensibility).toBe(75);
	});

	test('custom alpha/beta/radius', () => {
		const result = createHd2dCamera(instance.scene, {
			mode: 'editor',
			alpha: 1.0,
			beta: 0.8,
			radius: 50,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.alpha).toBeCloseTo(1.0);
		expect(result.data.beta).toBeCloseTo(0.8);
		expect(result.data.radius).toBe(50);
	});

	test('custom target position', () => {
		const result = createHd2dCamera(instance.scene, {
			mode: 'editor',
			targetX: 10,
			targetY: 5,
			targetZ: -20,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.target.x).toBeCloseTo(10);
		expect(result.data.target.y).toBeCloseTo(5);
		expect(result.data.target.z).toBeCloseTo(-20);
	});

	test('rejects invalid config', () => {
		const result = createHd2dCamera(instance.scene, { mode: 'invalid' });
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// updateCameraTarget (smooth follow)
// =============================================================================

describe('updateCameraTarget', () => {
	test('lerps camera target toward goal', () => {
		const cameraResult = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const camera: BABYLON.ArcRotateCamera = cameraResult.data;

		// Camera starts at origin
		expect(camera.target.x).toBeCloseTo(0);
		expect(camera.target.z).toBeCloseTo(0);

		// Move toward (10, 0, 10) with one frame at ~16ms
		const result = updateCameraTarget({
			camera,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 0.05,
		});
		expect(result.ok).toBeTruthy();

		// Should have moved SOME distance toward target but not all the way
		expect(camera.target.x).toBeGreaterThan(0);
		expect(camera.target.x).toBeLessThan(10);
		expect(camera.target.z).toBeGreaterThan(0);
		expect(camera.target.z).toBeLessThan(10);
	});

	test('followSpeed=0 produces no movement', () => {
		const cameraResult = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const camera: BABYLON.ArcRotateCamera = cameraResult.data;

		updateCameraTarget({
			camera,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 0,
		});

		expect(camera.target.x).toBeCloseTo(0);
		expect(camera.target.z).toBeCloseTo(0);
	});

	test('followSpeed=1 produces instant snap', () => {
		const cameraResult = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const camera: BABYLON.ArcRotateCamera = cameraResult.data;

		updateCameraTarget({
			camera,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 1,
		});

		expect(camera.target.x).toBeCloseTo(10);
		expect(camera.target.z).toBeCloseTo(10);
	});

	test('frame-rate independence: similar position at 16ms and 33ms', () => {
		// Create two cameras starting at origin
		const cam1Result = createHd2dCamera(instance.scene, { mode: 'gameplay' });
		if (!cam1Result.ok) throw new Error('Failed to create camera');
		const cam1: BABYLON.ArcRotateCamera = cam1Result.data;

		const cam2Result = createHd2dCamera(instance.scene, {
			mode: 'gameplay',
			alpha: Math.PI / 4 + 0.001, // slightly different to avoid name conflict
		});
		if (!cam2Result.ok) throw new Error('Failed to create camera');
		const cam2: BABYLON.ArcRotateCamera = cam2Result.data;

		const speed = 0.05;

		// Simulate 2 frames at 16ms (60fps) ≈ 32ms total
		updateCameraTarget({
			camera: cam1,
			targetX: 10,
			targetY: 0,
			targetZ: 0,
			deltaTimeMs: 16,
			followSpeed: speed,
		});
		updateCameraTarget({
			camera: cam1,
			targetX: 10,
			targetY: 0,
			targetZ: 0,
			deltaTimeMs: 16,
			followSpeed: speed,
		});

		// Simulate 1 frame at 33ms (30fps) ≈ 33ms total
		updateCameraTarget({
			camera: cam2,
			targetX: 10,
			targetY: 0,
			targetZ: 0,
			deltaTimeMs: 33,
			followSpeed: speed,
		});

		// Should be approximately the same position (within 15% tolerance)
		const ratio: number = cam1.target.x / cam2.target.x;
		expect(ratio).toBeGreaterThan(0.85);
		expect(ratio).toBeLessThan(1.15);
	});
});

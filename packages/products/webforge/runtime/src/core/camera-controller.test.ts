/**
 * Camera controller tests.
 *
 * Tests the 6-preset camera system: hd2d, topdown, sideview, firstperson,
 * cinematic, free. Also tests backward compatibility with legacy editor/gameplay
 * modes, smooth follow target updates, FF Tactics rotation, and screen shake.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import { createCamera, updateCameraTarget, rotateTactics, screenShake } from './camera-controller';

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
// HD-2D Preset (default)
// =============================================================================

describe('createCamera — hd2d preset (default)', () => {
	test('creates ArcRotateCamera with HD-2D defaults', () => {
		const result = createCamera(instance.scene, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(Math.PI / 4);
		expect(arc.beta).toBeCloseTo(Math.PI / 4);
		expect(arc.radius).toBe(100);
	});

	test('applies hd2d inertia (0.7)', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.7);
	});

	test('locks alpha to initial value for hd2d', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('disables panning for hd2d', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(0);
	});

	test('applies beta limits', () => {
		const result = createCamera(instance.scene, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerBetaLimit).toBeCloseTo(Math.PI / 6);
		expect(arc.upperBetaLimit).toBeCloseTo(Math.PI / 2.5);
	});

	test('applies radius limits', () => {
		const result = createCamera(instance.scene, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerRadiusLimit).toBe(30);
		expect(arc.upperRadiusLimit).toBe(300);
	});

	test('restricts panning to XZ plane', () => {
		const result = createCamera(instance.scene, {});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningAxis.y).toBe(0);
	});
});

// =============================================================================
// Topdown Preset
// =============================================================================

describe('createCamera — topdown preset', () => {
	test('creates ArcRotateCamera with near-zero beta (overhead)', () => {
		const result = createCamera(instance.scene, { preset: 'topdown' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(0.01);
	});

	test('locks beta for topdown', () => {
		const result = createCamera(instance.scene, { preset: 'topdown' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerBetaLimit).toBeCloseTo(0.01);
		expect(arc.upperBetaLimit).toBeCloseTo(0.01);
	});

	test('uses alpha 0 for topdown', () => {
		const result = createCamera(instance.scene, { preset: 'topdown' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(0);
	});
});

// =============================================================================
// Sideview Preset
// =============================================================================

describe('createCamera — sideview preset', () => {
	test('creates ArcRotateCamera with pi/2 beta (side-on)', () => {
		const result = createCamera(instance.scene, { preset: 'sideview' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(Math.PI / 2);
	});

	test('locks beta at pi/2 for sideview', () => {
		const result = createCamera(instance.scene, { preset: 'sideview' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerBetaLimit).toBeCloseTo(Math.PI / 2);
		expect(arc.upperBetaLimit).toBeCloseTo(Math.PI / 2);
	});

	test('uses alpha pi/2 for sideview', () => {
		const result = createCamera(instance.scene, { preset: 'sideview' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(Math.PI / 2);
	});
});

// =============================================================================
// Firstperson Preset
// =============================================================================

describe('createCamera — firstperson preset', () => {
	test('creates UniversalCamera', () => {
		const result = createCamera(instance.scene, { preset: 'firstperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.UniversalCamera);
	});

	test('has zero inertia for firstperson', () => {
		const result = createCamera(instance.scene, { preset: 'firstperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('has wider FOV for firstperson', () => {
		const result = createCamera(instance.scene, { preset: 'firstperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.fov).toBeCloseTo(1.2);
	});
});

// =============================================================================
// Cinematic Preset
// =============================================================================

describe('createCamera — cinematic preset', () => {
	test('creates ArcRotateCamera with low angle', () => {
		const result = createCamera(instance.scene, { preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(Math.PI / 6);
		expect(arc.beta).toBeCloseTo(Math.PI / 3);
	});

	test('has heavy inertia for cinematic', () => {
		const result = createCamera(instance.scene, { preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.9);
	});

	test('has wide FOV for cinematic', () => {
		const result = createCamera(instance.scene, { preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.fov).toBeCloseTo(1.2);
	});

	test('has shorter radius for cinematic', () => {
		const result = createCamera(instance.scene, { preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.radius).toBe(40);
	});
});

// =============================================================================
// Free Preset
// =============================================================================

describe('createCamera — free preset', () => {
	test('creates ArcRotateCamera with free orbit', () => {
		const result = createCamera(instance.scene, { preset: 'free' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		// Free orbit — no alpha limits
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});

	test('has zero inertia for free', () => {
		const result = createCamera(instance.scene, { preset: 'free' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('has panning enabled for free', () => {
		const result = createCamera(instance.scene, { preset: 'free' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(50);
	});
});

// =============================================================================
// Backward Compatibility (legacy mode)
// =============================================================================

describe('createCamera — backward compatibility', () => {
	test('mode: editor maps to free preset behavior', () => {
		const result = createCamera(instance.scene, { mode: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		// Editor = free preset: zero inertia, panning enabled, free orbit
		expect(arc.inertia).toBe(0);
		expect(arc.panningSensibility).toBe(50);
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});

	test('mode: gameplay maps to hd2d preset behavior', () => {
		const result = createCamera(instance.scene, { mode: 'gameplay' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		// Gameplay = hd2d preset: locked alpha, inertia 0.7
		expect(result.data.inertia).toBeCloseTo(0.7);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('explicit preset overrides legacy mode', () => {
		const result = createCamera(instance.scene, { mode: 'editor', preset: 'cinematic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		// Preset wins: cinematic has heavy inertia
		expect(result.data.inertia).toBeCloseTo(0.9);
	});
});

// =============================================================================
// Explicit Overrides
// =============================================================================

describe('createCamera — explicit overrides', () => {
	test('explicit inertia overrides preset default', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d', inertia: 0.5 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.5);
	});

	test('explicit panningSensibility overrides preset default', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d', panningSensibility: 75 });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(75);
	});

	test('custom alpha/beta/radius', () => {
		const result = createCamera(instance.scene, {
			preset: 'hd2d',
			alpha: 1.0,
			beta: 0.8,
			radius: 50,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(1.0);
		expect(arc.beta).toBeCloseTo(0.8);
		expect(arc.radius).toBe(50);
	});

	test('custom target position', () => {
		const result = createCamera(instance.scene, {
			targetX: 10,
			targetY: 5,
			targetZ: -20,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.target.x).toBeCloseTo(10);
		expect(arc.target.y).toBeCloseTo(5);
		expect(arc.target.z).toBeCloseTo(-20);
	});

	test('rejects invalid config', () => {
		const result = createCamera(instance.scene, { preset: 'invalid' });
		expect(result.ok).toBeFalsy();
	});
});

// =============================================================================
// updateCameraTarget (smooth follow)
// =============================================================================

describe('updateCameraTarget', () => {
	test('lerps camera target toward goal', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		const result = updateCameraTarget({
			camera: cameraResult.data,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 0.05,
		});
		expect(result.ok).toBeTruthy();

		// Should have moved SOME distance toward target but not all the way
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		expect(arc.target.x).toBeGreaterThan(0);
		expect(arc.target.x).toBeLessThan(10);
	});

	test('followSpeed=0 produces no movement', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		updateCameraTarget({
			camera: cameraResult.data,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 0,
		});

		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		expect(arc.target.x).toBeCloseTo(0);
		expect(arc.target.z).toBeCloseTo(0);
	});

	test('followSpeed=1 produces instant snap', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		updateCameraTarget({
			camera: cameraResult.data,
			targetX: 10,
			targetY: 0,
			targetZ: 10,
			deltaTimeMs: 16,
			followSpeed: 1,
		});

		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		expect(arc.target.x).toBeCloseTo(10);
		expect(arc.target.z).toBeCloseTo(10);
	});
});

// =============================================================================
// rotateTactics (FF Tactics 4-angle rotation)
// =============================================================================

describe('rotateTactics', () => {
	test('rotates alpha by pi/2 clockwise', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		const initialAlpha: number = arc.alpha;

		const result = rotateTactics({ camera: arc, direction: 'cw' });
		expect(result.ok).toBeTruthy();
		expect(arc.alpha).toBeCloseTo(initialAlpha + Math.PI / 2);
	});

	test('rotates alpha by pi/2 counter-clockwise', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		const initialAlpha: number = arc.alpha;

		const result = rotateTactics({ camera: arc, direction: 'ccw' });
		expect(result.ok).toBeTruthy();
		expect(arc.alpha).toBeCloseTo(initialAlpha - Math.PI / 2);
	});
});

// =============================================================================
// screenShake
// =============================================================================

describe('screenShake', () => {
	test('returns ok Result', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		const result = screenShake({
			scene: instance.scene,
			camera: cameraResult.data,
			intensity: 0.5,
			durationMs: 200,
			decay: true,
		});
		expect(result.ok).toBeTruthy();
	});

	test('returns handle with dispose function', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		const result = screenShake({
			scene: instance.scene,
			camera: cameraResult.data,
			intensity: 0.5,
			durationMs: 200,
			decay: true,
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(typeof result.data.dispose).toBe('function');
		// Disposing early should not throw
		result.data.dispose();
	});
});

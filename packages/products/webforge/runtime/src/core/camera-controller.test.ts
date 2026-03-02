/**
 * Camera controller tests.
 *
 * Tests the 16-preset camera system:
 * - Original 6: hd2d, topdown, sideview, firstperson, cinematic, free
 * - New 10: isometric, tactical, thirdperson, rts, dungeon, platformer,
 *   panoramic, orbit, editor, mapeditor
 *
 * Also tests backward compatibility with legacy editor/gameplay modes,
 * smooth follow target updates, FF Tactics rotation,
 * orthographic mode (mapeditor), auto-rotate (orbit), and resetCamera.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from './engine';
import { REFOCUS_DEFAULTS } from '../schemas/camera-config';
import {
	createCamera,
	updateCameraTarget,
	rotateTactics,
	switchCameraPreset,
	resetCamera,
	refocusOnTilemap,
} from './camera-controller';

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
// switchCameraPreset
// =============================================================================

describe('switchCameraPreset', () => {
	test('returns ok Result with a dispose handle', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		const result = switchCameraPreset({
			scene: instance.scene,
			camera: cameraResult.data as BABYLON.ArcRotateCamera,
			targetPreset: 'topdown',
			durationMs: 500,
			easing: 'easeInOutCubic',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(typeof result.data.dispose).toBe('function');
		result.data.dispose();
	});

	test('instantly applies target preset values when durationMs is 0', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = switchCameraPreset({
			scene: instance.scene,
			camera: arc,
			targetPreset: 'cinematic',
			durationMs: 0,
			easing: 'linear',
		});
		expect(result.ok).toBeTruthy();

		// Should immediately have cinematic defaults
		expect(arc.alpha).toBeCloseTo(Math.PI / 6);
		expect(arc.beta).toBeCloseTo(Math.PI / 3);
		expect(arc.radius).toBe(40);
		expect(arc.fov).toBeCloseTo(1.2);
	});

	test('dispose cancels transition and keeps current values', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = switchCameraPreset({
			scene: instance.scene,
			camera: arc,
			targetPreset: 'topdown',
			durationMs: 5000,
			easing: 'linear',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		// Dispose immediately — alpha should still be near hd2d default
		result.data.dispose();
		expect(arc.alpha).toBeCloseTo(Math.PI / 4);
	});

	test('updates alpha limits when transitioning to locked-alpha preset', () => {
		// Start with free (unlocked alpha)
		const cameraResult = createCamera(instance.scene, { preset: 'free' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		// Transition to hd2d (locked alpha) instantly
		const result = switchCameraPreset({
			scene: instance.scene,
			camera: arc,
			targetPreset: 'hd2d',
			durationMs: 0,
			easing: 'linear',
		});
		expect(result.ok).toBeTruthy();

		// Alpha limits should be locked to hd2d default
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('unlocks alpha limits when transitioning to free preset', () => {
		// Start with hd2d (locked alpha)
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		// Verify locked initially
		expect(arc.lowerAlphaLimit).not.toBeNull();

		// Transition to free (unlocked) instantly
		switchCameraPreset({
			scene: instance.scene,
			camera: arc,
			targetPreset: 'free',
			durationMs: 0,
			easing: 'linear',
		});

		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});
});

// =============================================================================
// Isometric Preset — True isometric (Diablo, Baldur's Gate)
// =============================================================================

describe('createCamera — isometric preset', () => {
	test('creates ArcRotateCamera with true isometric angle', () => {
		const result = createCamera(instance.scene, { preset: 'isometric' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		// True isometric: beta ≈ 35.264° = atan(1/√2)
		expect(arc.beta).toBeCloseTo(Math.atan(1 / Math.SQRT2));
		expect(arc.alpha).toBeCloseTo(Math.PI / 4);
	});

	test('locks both alpha and beta for isometric', () => {
		const result = createCamera(instance.scene, { preset: 'isometric' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.lowerBetaLimit).toBeCloseTo(Math.atan(1 / Math.SQRT2));
		expect(arc.upperBetaLimit).toBeCloseTo(Math.atan(1 / Math.SQRT2));
	});

	test('disables panning for isometric', () => {
		const result = createCamera(instance.scene, { preset: 'isometric' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(0);
	});
});

// =============================================================================
// Tactical Preset — Tactics/strategy (Fire Emblem, XCOM)
// =============================================================================

describe('createCamera — tactical preset', () => {
	test('creates ArcRotateCamera with steep overhead angle', () => {
		const result = createCamera(instance.scene, { preset: 'tactical' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(Math.PI / 6);
		expect(arc.radius).toBe(120);
	});

	test('locks alpha for tactical', () => {
		const result = createCamera(instance.scene, { preset: 'tactical' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('enables panning for tactical map scrolling', () => {
		const result = createCamera(instance.scene, { preset: 'tactical' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(50);
	});
});

// =============================================================================
// Third-Person Preset — Follow camera (action RPG, JRPG overworld)
// =============================================================================

describe('createCamera — thirdperson preset', () => {
	test('creates ArcRotateCamera with close shoulder-level angle', () => {
		const result = createCamera(instance.scene, { preset: 'thirdperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(Math.PI / 3);
		expect(arc.radius).toBe(25);
	});

	test('allows free orbit for thirdperson', () => {
		const result = createCamera(instance.scene, { preset: 'thirdperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});

	test('has smooth inertia for thirdperson follow', () => {
		const result = createCamera(instance.scene, { preset: 'thirdperson' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.85);
	});
});

// =============================================================================
// RTS Preset — Real-time strategy (Age of Empires, StarCraft)
// =============================================================================

describe('createCamera — rts preset', () => {
	test('creates ArcRotateCamera with battlefield overview angle', () => {
		const result = createCamera(instance.scene, { preset: 'rts' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(Math.PI / 5);
		expect(arc.radius).toBe(150);
	});

	test('locks alpha for rts', () => {
		const result = createCamera(instance.scene, { preset: 'rts' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
	});

	test('enables panning for rts map scrolling', () => {
		const result = createCamera(instance.scene, { preset: 'rts' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(50);
	});

	test('has responsive inertia for rts', () => {
		const result = createCamera(instance.scene, { preset: 'rts' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.3);
	});
});

// =============================================================================
// Dungeon Preset — Dungeon crawler (Diablo close-up, roguelikes)
// =============================================================================

describe('createCamera — dungeon preset', () => {
	test('creates ArcRotateCamera with steep close overhead', () => {
		const result = createCamera(instance.scene, { preset: 'dungeon' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(Math.PI / 8);
		expect(arc.radius).toBe(50);
	});

	test('locks both alpha and beta for dungeon', () => {
		const result = createCamera(instance.scene, { preset: 'dungeon' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 4);
		expect(arc.lowerBetaLimit).toBeCloseTo(Math.PI / 8);
		expect(arc.upperBetaLimit).toBeCloseTo(Math.PI / 8);
	});

	test('disables panning for dungeon', () => {
		const result = createCamera(instance.scene, { preset: 'dungeon' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(0);
	});
});

// =============================================================================
// Platformer Preset — 2.5D platformer (Kirby, LittleBigPlanet)
// =============================================================================

describe('createCamera — platformer preset', () => {
	test('creates ArcRotateCamera with side-on view', () => {
		const result = createCamera(instance.scene, { preset: 'platformer' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.alpha).toBeCloseTo(Math.PI / 2);
		expect(arc.beta).toBeCloseTo(Math.PI / 2);
	});

	test('has closer radius than sideview for tighter framing', () => {
		const result = createCamera(instance.scene, { preset: 'platformer' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.radius).toBe(50);
	});

	test('has narrower FOV for platformer', () => {
		const result = createCamera(instance.scene, { preset: 'platformer' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.fov).toBeCloseTo(0.7);
	});

	test('locks both alpha and beta for platformer', () => {
		const result = createCamera(instance.scene, { preset: 'platformer' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeCloseTo(Math.PI / 2);
		expect(arc.upperAlphaLimit).toBeCloseTo(Math.PI / 2);
		expect(arc.lowerBetaLimit).toBeCloseTo(Math.PI / 2);
		expect(arc.upperBetaLimit).toBeCloseTo(Math.PI / 2);
	});
});

// =============================================================================
// Panoramic Preset — Cinematic sweeping panorama
// =============================================================================

describe('createCamera — panoramic preset', () => {
	test('creates ArcRotateCamera with far distance and wide FOV', () => {
		const result = createCamera(instance.scene, { preset: 'panoramic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.radius).toBe(200);
		expect(arc.fov).toBeCloseTo(1.4);
	});

	test('has ultra-heavy inertia for panoramic sweep', () => {
		const result = createCamera(instance.scene, { preset: 'panoramic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBeCloseTo(0.95);
	});

	test('allows free orbit for panoramic', () => {
		const result = createCamera(instance.scene, { preset: 'panoramic' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});
});

// =============================================================================
// Orbit Preset — Auto-rotating model showcase
// =============================================================================

describe('createCamera — orbit preset', () => {
	test('creates ArcRotateCamera with auto-rotation enabled', () => {
		const result = createCamera(instance.scene, { preset: 'orbit' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.useAutoRotationBehavior).toBe(true);
	});

	test('allows free orbit for orbit preset', () => {
		const result = createCamera(instance.scene, { preset: 'orbit' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});

	test('has standard radius and inertia for orbit', () => {
		const result = createCamera(instance.scene, { preset: 'orbit' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.radius).toBe(80);
		expect(arc.inertia).toBeCloseTo(0.7);
	});

	test('does not auto-rotate for non-orbit presets', () => {
		const result = createCamera(instance.scene, { preset: 'hd2d' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.useAutoRotationBehavior).toBe(false);
	});
});

// =============================================================================
// Editor Preset — General-purpose level editor
// =============================================================================

describe('createCamera — editor preset', () => {
	test('creates ArcRotateCamera with free orbit', () => {
		const result = createCamera(instance.scene, { preset: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.lowerAlphaLimit).toBeNull();
		expect(arc.upperAlphaLimit).toBeNull();
	});

	test('has zero inertia for editor precision', () => {
		const result = createCamera(instance.scene, { preset: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});

	test('has panning enabled for editor', () => {
		const result = createCamera(instance.scene, { preset: 'editor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(50);
	});
});

// =============================================================================
// Map Editor Preset — RPG Maker-style (orthographic, north-up, pan-only)
// =============================================================================

describe('createCamera — mapeditor preset', () => {
	test('creates ArcRotateCamera in orthographic mode', () => {
		const result = createCamera(instance.scene, { preset: 'mapeditor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(BABYLON.ArcRotateCamera);
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.mode).toBe(BABYLON.Camera.ORTHOGRAPHIC_CAMERA);
	});

	test('sets symmetric orthographic bounds', () => {
		const result = createCamera(instance.scene, { preset: 'mapeditor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		// Bounds should be set and symmetric
		expect(arc.orthoLeft).toBeLessThan(0);
		expect(arc.orthoRight).toBeGreaterThan(0);
		expect(arc.orthoTop).toBeGreaterThan(0);
		expect(arc.orthoBottom).toBeLessThan(0);
		expect(arc.orthoLeft).toBe(-(arc.orthoRight as number));
		expect(arc.orthoBottom).toBe(-(arc.orthoTop as number));
	});

	test('locks to top-down north-up view', () => {
		const result = createCamera(instance.scene, { preset: 'mapeditor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.beta).toBeCloseTo(0.01);
		expect(arc.alpha).toBeCloseTo(0);
		// Both alpha and beta locked
		expect(arc.lowerAlphaLimit).toBeCloseTo(0);
		expect(arc.upperAlphaLimit).toBeCloseTo(0);
		expect(arc.lowerBetaLimit).toBeCloseTo(0.01);
		expect(arc.upperBetaLimit).toBeCloseTo(0.01);
	});

	test('enables panning for tile map editing', () => {
		const result = createCamera(instance.scene, { preset: 'mapeditor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		const arc = result.data as BABYLON.ArcRotateCamera;
		expect(arc.panningSensibility).toBe(50);
	});

	test('has zero inertia for precise editing', () => {
		const result = createCamera(instance.scene, { preset: 'mapeditor' });
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(result.data.inertia).toBe(0);
	});
});

// =============================================================================
// resetCamera
// =============================================================================

describe('resetCamera', () => {
	test('resets ArcRotateCamera to preset defaults', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		// Mutate camera away from defaults
		arc.alpha = 999;
		arc.beta = 999;
		arc.radius = 999;

		const result = resetCamera({
			scene: instance.scene,
			camera: arc,
			preset: 'hd2d',
		});
		expect(result.ok).toBeTruthy();
		expect(arc.alpha).toBeCloseTo(Math.PI / 4);
		expect(arc.beta).toBeCloseTo(Math.PI / 4);
		expect(arc.radius).toBe(100);
	});

	test('resets to different preset', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = resetCamera({
			scene: instance.scene,
			camera: arc,
			preset: 'cinematic',
		});
		expect(result.ok).toBeTruthy();
		expect(arc.alpha).toBeCloseTo(Math.PI / 6);
		expect(arc.beta).toBeCloseTo(Math.PI / 3);
		expect(arc.radius).toBe(40);
	});

	test('resets inertia and panning to preset defaults', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'free' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		// Mutate
		arc.inertia = 0.99;
		arc.panningSensibility = 999;

		resetCamera({
			scene: instance.scene,
			camera: arc,
			preset: 'free',
		});

		expect(arc.inertia).toBe(0);
		expect(arc.panningSensibility).toBe(50);
	});

	test('resets FOV to preset default', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		cameraResult.data.fov = 2.0;

		resetCamera({
			scene: instance.scene,
			camera: cameraResult.data,
			preset: 'panoramic',
		});

		expect(cameraResult.data.fov).toBeCloseTo(1.4);
	});
});

// =============================================================================
// Refocus On Tilemap
// =============================================================================

describe('refocusOnTilemap', () => {
	test('returns ok Result with dispose handle', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 40,
			mapHeight: 30,
			config: REFOCUS_DEFAULTS,
			currentPreset: 'hd2d',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;
		expect(typeof result.data.dispose).toBe('function');
		result.data.dispose();
	});

	test('instantly sets camera to map center when animated=false', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 40,
			mapHeight: 30,
			config: { ...REFOCUS_DEFAULTS, animated: false },
			currentPreset: 'hd2d',
		});
		expect(result.ok).toBeTruthy();

		expect(arc.target.x).toBeCloseTo(20);
		expect(arc.target.z).toBeCloseTo(15);
	});

	test('computes correct radius from map dimensions and FOV', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 40,
			mapHeight: 30,
			config: { ...REFOCUS_DEFAULTS, animated: false, paddingScale: 1.0 },
			currentPreset: 'hd2d',
		});

		const diagonal = Math.hypot(40, 30);
		const boundRadius = diagonal / 2;
		const expectedRadius = boundRadius / Math.sin(arc.fov / 2);
		expect(arc.radius).toBeCloseTo(expectedRadius, 0);
	});

	test('applies paddingScale to radius', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 32,
			mapHeight: 32,
			config: { ...REFOCUS_DEFAULTS, animated: false, paddingScale: 1.5 },
			currentPreset: 'hd2d',
		});

		const diagonal = Math.hypot(32, 32);
		const boundRadius = diagonal / 2;
		const expectedRadius = (boundRadius / Math.sin(arc.fov / 2)) * 1.5;
		expect(arc.radius).toBeCloseTo(expectedRadius, 0);
	});

	test('resets beta when resetElevation=true', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		arc.beta = 1.2;

		refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 32,
			mapHeight: 32,
			config: { ...REFOCUS_DEFAULTS, animated: false, resetElevation: true },
			currentPreset: 'hd2d',
		});

		// hd2d default beta is PI/4
		expect(arc.beta).toBeCloseTo(Math.PI / 4);
	});

	test('does not reset beta when resetElevation=false', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;
		arc.beta = 1.2;

		refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 32,
			mapHeight: 32,
			config: { ...REFOCUS_DEFAULTS, animated: false, resetElevation: false },
			currentPreset: 'hd2d',
		});

		expect(arc.beta).toBeCloseTo(1.2);
	});

	test('dispose cancels animation', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 40,
			mapHeight: 30,
			config: { ...REFOCUS_DEFAULTS, animated: true, durationMs: 5000 },
			currentPreset: 'hd2d',
		});
		expect(result.ok).toBeTruthy();
		if (!result.ok) return;

		const alphaBefore = arc.alpha;
		result.data.dispose();
		// Alpha should stay near where it was when disposed
		expect(arc.alpha).toBeCloseTo(alphaBefore, 1);
	});

	test('returns error for non-ArcRotateCamera (firstperson)', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'firstperson' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');

		const result = refocusOnTilemap({
			scene: instance.scene,
			camera: cameraResult.data,
			mapWidth: 40,
			mapHeight: 30,
			config: REFOCUS_DEFAULTS,
			currentPreset: 'firstperson',
		});
		expect(result.ok).toBeFalsy();
	});

	test('handles zero-size map gracefully', () => {
		const cameraResult = createCamera(instance.scene, { preset: 'hd2d' });
		if (!cameraResult.ok) throw new Error('Failed to create camera');
		const arc = cameraResult.data as BABYLON.ArcRotateCamera;

		const result = refocusOnTilemap({
			scene: instance.scene,
			camera: arc,
			mapWidth: 0,
			mapHeight: 0,
			config: { ...REFOCUS_DEFAULTS, animated: false },
			currentPreset: 'hd2d',
		});
		expect(result.ok).toBeTruthy();
		expect(arc.radius).toBeGreaterThan(0);
	});
});

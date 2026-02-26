/**
 * Tests for tile-animator — UV cycling for animated tilesets.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Bool, Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import {
	advanceAnimations,
	computeFrameIndex,
	createTileAnimator,
	disposeTileAnimator,
	registerAnimatedMaterial,
	type TileAnimationManager,
} from './tile-animator';

// =============================================================================
// Helpers
// =============================================================================

let instance: BabylonEngineInstance | null = null;

afterEach(() => {
	if (instance) {
		disposeEngine(instance);
		instance = null;
	}
});

/**
 * Creates a NullEngine scene for testing.
 *
 * @returns The Babylon.js scene
 */
function setupEngine(): BABYLON.Scene {
	const result: BabylonResult<BabylonEngineInstance> = createTestEngine();
	expect(result.ok).toBe(true);
	if (!result.ok) throw new Error('Engine creation failed');
	instance = result.data;
	return instance.scene;
}

/**
 * Creates a StandardMaterial with a texture for testing animation.
 *
 * @param scene - The Babylon.js scene
 * @param name - Material name
 * @returns The created material
 */
function createTestMaterial(scene: BABYLON.Scene, name: string): BABYLON.StandardMaterial {
	const mat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(name, scene);
	const tex: BABYLON.Texture = new BABYLON.Texture(
		'test.png',
		scene,
		true,
		undefined,
		BABYLON.Texture.NEAREST_SAMPLINGMODE,
	);
	mat.diffuseTexture = tex;
	return mat;
}

// =============================================================================
// computeFrameIndex (pure logic)
// =============================================================================

describe('computeFrameIndex', () => {
	it('returns frame 0 when elapsed is less than frame duration', () => {
		// speed=4fps → frame duration = 250ms
		const result: Result<Num> = computeFrameIndex({
			elapsed: 100,
			speed: 4,
			frameCount: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('returns frame 1 after one frame duration', () => {
		// speed=4fps → 250ms per frame
		const result: Result<Num> = computeFrameIndex({
			elapsed: 250,
			speed: 4,
			frameCount: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(1);
	});

	it('wraps around when elapsed exceeds all frames', () => {
		// 3 frames at 4fps = 750ms total, 800ms → frame 0 (wrapped)
		const result: Result<Num> = computeFrameIndex({
			elapsed: 800,
			speed: 4,
			frameCount: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 800 / 250 = 3.2, floor = 3, 3 % 3 = 0
		expect(result.data).toBe(0);
	});

	it('handles high speed correctly', () => {
		// speed=10fps → 100ms per frame
		const result: Result<Num> = computeFrameIndex({
			elapsed: 350,
			speed: 10,
			frameCount: 4,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 350 / 100 = 3.5, floor = 3, 3 % 4 = 3
		expect(result.data).toBe(3);
	});

	it('returns frame 0 for zero elapsed', () => {
		const result: Result<Num> = computeFrameIndex({
			elapsed: 0,
			speed: 4,
			frameCount: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('handles single frame (no animation)', () => {
		const result: Result<Num> = computeFrameIndex({
			elapsed: 5000,
			speed: 4,
			frameCount: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Any elapsed % 1 = 0
		expect(result.data).toBe(0);
	});
});

// =============================================================================
// createTileAnimator (NullEngine integration)
// =============================================================================

describe('createTileAnimator', () => {
	it('creates animator with empty entries', () => {
		const scene: BABYLON.Scene = setupEngine();
		const result: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.entries).toHaveLength(0);
	});

	it('registers a beforeRender observer', () => {
		const scene: BABYLON.Scene = setupEngine();
		const before: Num = scene.onBeforeRenderObservable.observers.length;
		const result: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(scene.onBeforeRenderObservable.observers.length).toBe(before + 1);
	});
});

// =============================================================================
// registerAnimatedMaterial
// =============================================================================

describe('registerAnimatedMaterial', () => {
	it('adds entry to animator', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		const result: Result<Bool> = registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});
		expect(result.ok).toBe(true);
		expect(animResult.data.entries).toHaveLength(1);
	});

	it('computes correct frameWidth for 3 frames', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});
		// frameWidth = 1 / frameCount = 1/3
		const entry = animResult.data.entries[0]!;
		expect(entry.frameWidth).toBeCloseTo(1 / 3);
	});
});

// =============================================================================
// advanceAnimations (pure logic)
// =============================================================================

describe('advanceAnimations', () => {
	it('advances elapsed time on entries', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});

		advanceAnimations({ animator: animResult.data, deltaTimeMs: 100 });
		expect(animResult.data.entries[0]!.elapsed).toBe(100);
	});

	it('updates uOffset when frame changes', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});

		// Advance 300ms → should be frame 1 (250ms per frame at 4fps)
		advanceAnimations({ animator: animResult.data, deltaTimeMs: 300 });
		const tex: BABYLON.Texture = mat.diffuseTexture as BABYLON.Texture;
		// frame 1 → uOffset = 1 * (1/3)
		expect(tex.uOffset).toBeCloseTo(1 / 3);
	});

	it('wraps uOffset back to 0 after full cycle', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});

		// 3 frames × 250ms = 750ms full cycle. Advance 800ms → frame 0 (wrapped)
		advanceAnimations({ animator: animResult.data, deltaTimeMs: 800 });
		const tex: BABYLON.Texture = mat.diffuseTexture as BABYLON.Texture;
		expect(tex.uOffset).toBeCloseTo(0);
	});
});

// =============================================================================
// disposeTileAnimator
// =============================================================================

describe('disposeTileAnimator', () => {
	it('stops animation after disposal', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});

		// Advance to frame 1
		advanceAnimations({ animator: animResult.data, deltaTimeMs: 300 });
		const tex: BABYLON.Texture = mat.diffuseTexture as BABYLON.Texture;
		const offsetBefore: Num = tex.uOffset;
		expect(offsetBefore).toBeCloseTo(1 / 3);

		// Dispose clears entries, so further advances have no effect
		const result: Result<Bool> = disposeTileAnimator({ animator: animResult.data });
		expect(result.ok).toBe(true);

		advanceAnimations({ animator: animResult.data, deltaTimeMs: 500 });
		expect(tex.uOffset).toBeCloseTo(offsetBefore);
	});

	it('clears entries array', () => {
		const scene: BABYLON.Scene = setupEngine();
		const animResult: BabylonResult<TileAnimationManager> = createTileAnimator({ scene });
		expect(animResult.ok).toBe(true);
		if (!animResult.ok) return;

		const mat: BABYLON.StandardMaterial = createTestMaterial(scene, 'anim-mat');
		registerAnimatedMaterial({
			animator: animResult.data,
			material: mat,
			frameCount: 3,
			speed: 4,
		});
		expect(animResult.data.entries).toHaveLength(1);

		disposeTileAnimator({ animator: animResult.data });
		expect(animResult.data.entries).toHaveLength(0);
	});
});

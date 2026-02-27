/**
 * Parallax manager tests.
 *
 * Tests parallax layer creation, UV offset computation,
 * per-frame observer registration, and disposal.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { ParallaxLayer } from '../schemas/sky-config';
import { createParallax, disposeParallax, computeParallaxOffset } from './parallax-manager';

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
// computeParallaxOffset (pure math)
// =============================================================================

describe('computeParallaxOffset', () => {
	test('computes correct X offset for camera position', () => {
		const offset = computeParallaxOffset({
			cameraX: 10,
			cameraZ: 0,
			scrollSpeedX: 0.5,
			scrollSpeedY: 0,
		});
		expect(offset.x).toBeCloseTo(5);
		expect(offset.y).toBeCloseTo(0);
	});

	test('computes correct Y offset from Z movement', () => {
		const offset = computeParallaxOffset({
			cameraX: 0,
			cameraZ: 20,
			scrollSpeedX: 0,
			scrollSpeedY: 0.3,
		});
		expect(offset.x).toBeCloseTo(0);
		expect(offset.y).toBeCloseTo(6);
	});

	test('negative scroll speed reverses direction', () => {
		const offset = computeParallaxOffset({
			cameraX: 10,
			cameraZ: 0,
			scrollSpeedX: -0.5,
			scrollSpeedY: 0,
		});
		expect(offset.x).toBeCloseTo(-5);
	});

	test('zero speed produces zero offset', () => {
		const offset = computeParallaxOffset({
			cameraX: 100,
			cameraZ: 100,
			scrollSpeedX: 0,
			scrollSpeedY: 0,
		});
		expect(offset.x).toBeCloseTo(0);
		expect(offset.y).toBeCloseTo(0);
	});
});

// =============================================================================
// createParallax
// =============================================================================

describe('createParallax', () => {
	test('creates background layer per parallax config', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/mountains.png',
				scrollSpeedX: 0.3,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
			{
				imagePath: 'bg/clouds.png',
				scrollSpeedX: 0.5,
				scrollSpeedY: 0,
				offsetY: 5,
				opacity: 0.7,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bgLayers).toHaveLength(2);
	});

	test('applies opacity to layer color alpha', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/trees.png',
				scrollSpeedX: 0.4,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 0.6,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bgLayers[0]!.color.a).toBeCloseTo(0.6);
	});

	test('empty layers array creates empty instance', () => {
		const result = createParallax({
			scene: instance.scene,
			layers: [],
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bgLayers).toHaveLength(0);
	});

	test('registers onBeforeRender observer when layers exist', () => {
		const observerCountBefore = instance.scene.onBeforeRenderObservable.observers.length;
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/hills.png',
				scrollSpeedX: 0.5,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(instance.scene.onBeforeRenderObservable.observers.length).toBeGreaterThan(
			observerCountBefore,
		);
	});
});

// =============================================================================
// disposeParallax
// =============================================================================

describe('disposeParallax', () => {
	test('disposes all background layers', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/mountains.png',
				scrollSpeedX: 0.3,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layerCountBefore = instance.scene.layers.length;
		const disposeResult = disposeParallax({ parallax: result.data });
		expect(disposeResult.ok).toBe(true);
		expect(instance.scene.layers.length).toBeLessThan(layerCountBefore);
	});

	test('removes onBeforeRender observer', () => {
		const layers: readonly ParallaxLayer[] = [
			{
				imagePath: 'bg/hills.png',
				scrollSpeedX: 0.5,
				scrollSpeedY: 0,
				offsetY: 0,
				opacity: 1,
				tileX: true,
				tileY: false,
				scale: 1,
				autoScrollX: 0,
				autoScrollY: 0,
				layerType: 'background',
				blendMode: 'alpha',
				tint: { r: 1, g: 1, b: 1, a: 1 },
				depth: 0,
			},
		];
		const result = createParallax({
			scene: instance.scene,
			layers,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Verify the observer exists before dispose
		expect(result.data.observer).not.toBeNull();
		disposeParallax({ parallax: result.data });
		// After dispose, the observer reference was removed from the observable
		// (Babylon.js sets the slot to null rather than shrinking the array)
		expect(
			instance.scene.onBeforeRenderObservable.hasObservers() === false ||
				instance.scene.onBeforeRenderObservable.observers.some(
					(o) => o === result.data.observer,
				) === false,
		).toBe(true);
	});

	test('handles empty parallax instance', () => {
		const result = createParallax({
			scene: instance.scene,
			layers: [],
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const disposeResult = disposeParallax({ parallax: result.data });
		expect(disposeResult.ok).toBe(true);
	});
});

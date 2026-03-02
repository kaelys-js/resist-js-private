/**
 * Tile streaming manager tests.
 *
 * Tests for region-based tile streaming: region grid calculation,
 * region loading/unloading, LRU eviction, and viewport updates.
 *
 * @module
 */

import type * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';

import {
	computeVisibleRegions,
	createStreamingManager,
	updateStreamingViewport,
	disposeStreamingManager,
	type StreamingManager,
} from './tile-streaming';
import type { StreamingConfig } from './streaming-config';

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
 * Creates a flat tile data array filled with sequential IDs.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @returns Flat tile ID array
 */
function makeTileData(width: Num, height: Num): Num[] {
	return Array.from({ length: width * height }, (_, i) => (i % 255) + 1);
}

// =============================================================================
// computeVisibleRegions
// =============================================================================

describe('computeVisibleRegions', () => {
	it('returns single region for viewport within one region', () => {
		const regions = computeVisibleRegions({
			viewportMinX: 100,
			viewportMinZ: 100,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			regionSize: 2048,
			loadRadius: 0,
		});
		expect(regions.length).toBe(1);
		expect(regions[0]).toEqual({ rx: 0, rz: 0 });
	});

	it('returns multiple regions when viewport spans boundaries', () => {
		const regions = computeVisibleRegions({
			viewportMinX: 1900,
			viewportMinZ: 1900,
			viewportMaxX: 2200,
			viewportMaxZ: 2200,
			regionSize: 2048,
			loadRadius: 0,
		});
		// Spans region boundary at 2048
		expect(regions.length).toBe(4);
	});

	it('includes load radius buffer', () => {
		const regions = computeVisibleRegions({
			viewportMinX: 100,
			viewportMinZ: 100,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			regionSize: 2048,
			loadRadius: 1,
		});
		// Center region (0,0) plus neighbors
		expect(regions.length).toBeGreaterThan(1);
	});

	it('clamps to non-negative region coordinates', () => {
		const regions = computeVisibleRegions({
			viewportMinX: -100,
			viewportMinZ: -100,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			regionSize: 2048,
			loadRadius: 1,
		});
		// All regions should have non-negative coordinates
		for (const r of regions) {
			expect(r.rx).toBeGreaterThanOrEqual(0);
			expect(r.rz).toBeGreaterThanOrEqual(0);
		}
	});
});

// =============================================================================
// createStreamingManager
// =============================================================================

describe('createStreamingManager', () => {
	it('creates a manager with empty regions', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 1,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(4096, 4096);

		const result = createStreamingManager({
			scene,
			mapWidth: 4096,
			mapHeight: 4096,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.regions.length).toBe(0);
		expect(result.data.config.regionSize).toBe(2048);
	});

	it('stores map dimensions', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 1,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(5000, 3000);

		const result = createStreamingManager({
			scene,
			mapWidth: 5000,
			mapHeight: 3000,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.mapWidth).toBe(5000);
		expect(result.data.mapHeight).toBe(3000);
	});
});

// =============================================================================
// updateStreamingViewport
// =============================================================================

describe('updateStreamingViewport', () => {
	it('loads regions visible to the viewport', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 0,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(4096, 4096);

		const createResult = createStreamingManager({
			scene,
			mapWidth: 4096,
			mapHeight: 4096,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		// Viewport at top-left covering first region
		updateStreamingViewport({
			manager,
			viewportMinX: 0,
			viewportMinZ: 0,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			currentFrame: 1,
		});

		expect(manager.regions.length).toBe(1);
		expect(manager.regions[0]?.regionX).toBe(0);
		expect(manager.regions[0]?.regionZ).toBe(0);
	});

	it('loads multiple regions when viewport spans boundaries', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 0,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(4096, 4096);

		const createResult = createStreamingManager({
			scene,
			mapWidth: 4096,
			mapHeight: 4096,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		// Viewport spanning all 4 regions of a 4096×4096 map with 2048 region size
		updateStreamingViewport({
			manager,
			viewportMinX: 1900,
			viewportMinZ: 1900,
			viewportMaxX: 2200,
			viewportMaxZ: 2200,
			currentFrame: 1,
		});

		expect(manager.regions.length).toBe(4);
	});

	it('unloads regions beyond unload distance', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 0,
			unloadDistance: 2,
		};
		// Use narrow map (8192 wide × 100 tall) to avoid massive array
		const tileData: Num[] = makeTileData(8192, 100);

		const createResult = createStreamingManager({
			scene,
			mapWidth: 8192,
			mapHeight: 100,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		// Load region at (0,0)
		updateStreamingViewport({
			manager,
			viewportMinX: 0,
			viewportMinZ: 0,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			currentFrame: 1,
		});
		expect(manager.regions.length).toBe(1);

		// Move far away horizontally — region (0,0) should be unloaded
		updateStreamingViewport({
			manager,
			viewportMinX: 6000,
			viewportMinZ: 0,
			viewportMaxX: 6500,
			viewportMaxZ: 50,
			currentFrame: 2,
		});
		// New region loaded, old one unloaded
		const hasOldRegion = manager.regions.some((r) => r.regionX === 0 && r.regionZ === 0);
		expect(hasOldRegion).toBe(false);
	});

	it('updates lastAccessFrame for visible regions', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 0,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(4096, 4096);

		const createResult = createStreamingManager({
			scene,
			mapWidth: 4096,
			mapHeight: 4096,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		updateStreamingViewport({
			manager,
			viewportMinX: 0,
			viewportMinZ: 0,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			currentFrame: 10,
		});

		expect(manager.regions[0]?.lastAccessFrame).toBe(10);

		// Update again at a later frame
		updateStreamingViewport({
			manager,
			viewportMinX: 0,
			viewportMinZ: 0,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			currentFrame: 20,
		});

		expect(manager.regions[0]?.lastAccessFrame).toBe(20);
	});

	it('evicts oldest regions when max exceeded', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048, // Schema requires 2048 or 4096
			maxLoadedRegions: 4,
			loadRadius: 0,
			unloadDistance: 100,
		};
		// Use 2048-based regions but smaller map: 6 regions wide
		const mapSize: Num = 2048 * 6;
		// Sparse tile data — only allocate what we need (use lazy approach)
		const tileData: Num[] = new Array(mapSize * 100).fill(1);

		const createResult = createStreamingManager({
			scene,
			mapWidth: mapSize,
			mapHeight: 100,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		// Load regions sequentially across different columns
		for (let i: Num = 0; i < 6; i++) {
			updateStreamingViewport({
				manager,
				viewportMinX: i * 2048 + 100,
				viewportMinZ: 10,
				viewportMaxX: i * 2048 + 500,
				viewportMaxZ: 50,
				currentFrame: i + 1,
			});
		}

		// Should not exceed maxLoadedRegions
		expect(manager.regions.length).toBeLessThanOrEqual(4);
	});
});

// =============================================================================
// disposeStreamingManager
// =============================================================================

describe('disposeStreamingManager', () => {
	it('removes all loaded regions', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: StreamingConfig = {
			regionSize: 2048,
			maxLoadedRegions: 16,
			loadRadius: 0,
			unloadDistance: 3,
		};
		const tileData: Num[] = makeTileData(4096, 4096);

		const createResult = createStreamingManager({
			scene,
			mapWidth: 4096,
			mapHeight: 4096,
			tileData,
			config,
			atlasTexture: null,
			tilePixelWidth: 32,
			tilePixelHeight: 32,
			tileWorldSize: 1,
		});
		expect(createResult.ok).toBe(true);
		if (!createResult.ok) return;

		const manager: StreamingManager = createResult.data;

		// Load a region
		updateStreamingViewport({
			manager,
			viewportMinX: 0,
			viewportMinZ: 0,
			viewportMaxX: 500,
			viewportMaxZ: 500,
			currentFrame: 1,
		});
		expect(manager.regions.length).toBeGreaterThan(0);

		const meshCountBefore: Num = scene.meshes.length;
		disposeStreamingManager({ manager });
		expect(manager.regions.length).toBe(0);
		expect(scene.meshes.length).toBeLessThan(meshCountBefore);
	});
});

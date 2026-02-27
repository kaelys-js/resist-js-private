/**
 * Tests for tilemap-renderer — end-to-end MapData → scene pipeline.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import {
	disposeTilemap,
	renderTilemap,
	setLayerOpacity,
	setLayerVisibility,
	updateTile,
	type RenderedTilemap,
} from './tilemap-renderer';

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
 * Creates a minimal valid MapData object.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @returns A valid MapData-shaped plain object
 */
function makeMinimalMapData(width: Num, height: Num): Record<string, unknown> {
	return {
		width,
		height,
		tileWidth: 48,
		tileHeight: 48,
		tilesets: [
			{
				name: 'terrain',
				imagePath: 'tilesets/terrain.png',
				tileWidth: 48,
				tileHeight: 48,
				columns: 4,
				rows: 4,
				firstGid: 1,
				autotileType: 'none',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
		],
		layers: [
			{
				name: 'ground',
				type: 'ground',
				data: Array.from({ length: width * height }, () => 1),
				visible: true,
				opacity: 1,
			},
		],
	};
}

// =============================================================================
// renderTilemap
// =============================================================================

describe('renderTilemap', () => {
	it('renders minimal valid map (4x4, 1 layer, 1 tileset)', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.chunks.length).toBeGreaterThan(0);
		expect(result.data.tilesets.length).toBe(1);
		expect(result.data.materials.length).toBe(1);
	});

	it('returns error for invalid MapData (missing width)', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = {
			height: 4,
			tilesets: [],
			layers: [],
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(false);
	});

	it('returns error for layer data length mismatch', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [
				{
					name: 'terrain',
					imagePath: 'terrain.png',
					tileWidth: 48,
					tileHeight: 48,
					columns: 4,
					rows: 4,
					firstGid: 1,
					autotileType: 'none',
					animationFrames: 1,
					animationSpeed: 4,
					tileProperties: {},
				},
			],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: [1, 2, 3], // Wrong length — should be 16
					visible: true,
					opacity: 1,
				},
			],
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(false);
	});

	it('generates cliff chunks when heightMap is provided', () => {
		const scene: BABYLON.Scene = setupEngine();
		const heightMap: Num[] = Array.from({ length: 16 }, () => 0);
		heightMap[5] = 2; // (1,1) raised
		const mapData: unknown = {
			...makeMinimalMapData(4, 4),
			heightMap,
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.cliffChunks.length).toBeGreaterThan(0);
	});

	it('returns error for heightMap length mismatch', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = {
			...makeMinimalMapData(4, 4),
			heightMap: [0, 0, 0], // Wrong length — should be 16
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(false);
	});

	it('accepts custom chunkConfig', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(8, 8);

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
			chunkConfig: { chunkSize: 4 },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 8×8 map with chunkSize 4 → 2×2 = 4 chunks per layer
		// (some may be null if empty, but loaded chunks should exist)
		expect(result.data.chunks.length).toBe(4);
	});

	it('defaults postProcessing to null when not configured', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.postProcessing).toBeNull();
	});

	it('defaults lighting to null when not configured', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.lighting).toBeNull();
	});

	it('creates lighting instance when lighting config provided', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = {
			...makeMinimalMapData(4, 4),
			lighting: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
						intensity: 0.6,
						direction: { x: 0, y: 1, z: 0 },
					},
				],
			},
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.lighting).not.toBeNull();
		expect(result.data.lighting?.lights).toHaveLength(1);
	});

	it('creates post-processing pipeline when configured', () => {
		const scene: BABYLON.Scene = setupEngine();
		// eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
		new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);

		const mapData: unknown = {
			...makeMinimalMapData(4, 4),
			postProcessing: { preset: 'hd2d' },
		};

		const result: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.postProcessing).not.toBeNull();
	});
});

// =============================================================================
// disposeTilemap
// =============================================================================

describe('disposeTilemap', () => {
	it('disposes lighting along with other resources', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = {
			...makeMinimalMapData(4, 4),
			lighting: {
				lights: [
					{
						id: 'ambient',
						type: 'hemispheric',
						intensity: 0.6,
						direction: { x: 0, y: 1, z: 0 },
					},
				],
			},
		};

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		// Verify lighting was created
		expect(renderResult.data.lighting).not.toBeNull();

		const result = disposeTilemap({ tilemap: renderResult.data });
		expect(result.ok).toBe(true);
	});

	it('disposes all meshes, materials, and textures', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		const tilemap: RenderedTilemap = renderResult.data;
		const meshes: BABYLON.Mesh[] = tilemap.chunks.map((c) => c.mesh);

		const result = disposeTilemap({ tilemap });
		expect(result.ok).toBe(true);

		// All meshes should be disposed
		for (const mesh of meshes) {
			expect(mesh.isDisposed()).toBe(true);
		}
	});
});

// =============================================================================
// updateTile
// =============================================================================

describe('updateTile', () => {
	it('rebuilds affected chunk when tile changes', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		const oldMesh: BABYLON.Mesh = renderResult.data.chunks[0]!.mesh;

		const result: BabylonResult<RenderedTilemap> = updateTile({
			tilemap: renderResult.data,
			layerIndex: 0,
			x: 0,
			z: 0,
			newTileId: 2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Mesh should be reused in-place (not disposed)
		expect(oldMesh.isDisposed()).toBe(false);
		// Updated chunk should exist and use the same mesh instance
		expect(result.data.chunks.length).toBeGreaterThan(0);
		expect(result.data.chunks[0]!.mesh).toBe(oldMesh);
	});
});

// =============================================================================
// setLayerVisibility + setLayerOpacity
// =============================================================================

describe('setLayerVisibility', () => {
	it('hides all chunks for a layer', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		const result = setLayerVisibility({
			tilemap: renderResult.data,
			layerIndex: 0,
			visible: false,
		});
		expect(result.ok).toBe(true);

		for (const chunk of renderResult.data.chunks) {
			if (chunk.layerIndex === 0) {
				expect(chunk.mesh.isVisible).toBe(false);
			}
		}
	});

	it('returns ok for non-existent layer index (no-op)', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		const result = setLayerVisibility({
			tilemap: renderResult.data,
			layerIndex: 99,
			visible: false,
		});
		expect(result.ok).toBe(true);
	});
});

describe('setLayerOpacity', () => {
	it('sets visibility on all chunks for a layer', () => {
		const scene: BABYLON.Scene = setupEngine();
		const mapData: unknown = makeMinimalMapData(4, 4);

		const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
			scene,
			mapDataInput: mapData,
			assetBasePath: '/assets/',
		});
		expect(renderResult.ok).toBe(true);
		if (!renderResult.ok) return;

		const result = setLayerOpacity({
			tilemap: renderResult.data,
			layerIndex: 0,
			opacity: 0.3,
		});
		expect(result.ok).toBe(true);

		for (const chunk of renderResult.data.chunks) {
			if (chunk.layerIndex === 0) {
				expect(chunk.mesh.visibility).toBeCloseTo(0.3);
			}
		}
	});
});

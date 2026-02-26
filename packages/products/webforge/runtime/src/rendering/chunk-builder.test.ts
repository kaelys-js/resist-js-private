/**
 * Tests for chunk-builder — merged mesh construction per 16x16 chunk.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import type { MapData, TilesetConfig } from '../schemas/map-data';
import { computeTileUVs, type LoadedTileset } from './tileset-loader';
import type { TileUV } from './tile-geometry';
import {
	buildChunk,
	buildCliffChunk,
	rebuildChunk,
	type ChunkBuildContext,
	type ChunkMesh,
} from './chunk-builder';

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
 * Creates a minimal tileset config.
 *
 * @param name - Tileset name
 * @param firstGid - First global tile ID
 * @param columns - Number of columns
 * @param rows - Number of rows
 * @returns TilesetConfig
 */
function makeConfig(name: string, firstGid: Num, columns: Num, rows: Num): TilesetConfig {
	return {
		name,
		imagePath: `${name}.png`,
		tileWidth: 48,
		tileHeight: 48,
		columns,
		rows,
		firstGid,
		autotileType: 'none',
		animationFrames: 1,
		animationSpeed: 4,
		tileProperties: {},
	};
}

/**
 * Creates a LoadedTileset stub for testing.
 *
 * @param scene - The Babylon.js scene
 * @param config - Tileset configuration
 * @returns LoadedTileset
 */
function makeLoadedTileset(scene: BABYLON.Scene, config: TilesetConfig): LoadedTileset {
	const tex: BABYLON.Texture = new BABYLON.Texture(
		null,
		scene,
		true,
		undefined,
		BABYLON.Texture.NEAREST_SAMPLINGMODE,
	);
	const uvResult = computeTileUVs({
		columns: config.columns,
		rows: config.rows,
		tileWidth: config.tileWidth,
		tileHeight: config.tileHeight,
	});
	const uvLookup: readonly TileUV[] = uvResult.ok ? uvResult.data : [];
	return { config, texture: tex, uvLookup };
}

/**
 * Creates a ChunkBuildContext for testing.
 *
 * @param scene - The Babylon.js scene
 * @param mapData - Map data
 * @param tilesets - Loaded tilesets
 * @param chunkSize - Chunk size in tiles
 * @returns ChunkBuildContext
 */
function makeContext(
	scene: BABYLON.Scene,
	mapData: MapData,
	tilesets: readonly LoadedTileset[],
	chunkSize: Num,
): ChunkBuildContext {
	const materials: BABYLON.StandardMaterial[] = tilesets.map((ts) => {
		const mat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(ts.config.name, scene);
		mat.diffuseTexture = ts.texture;
		return mat;
	});
	return {
		scene,
		mapData,
		loadedTilesets: tilesets,
		materials,
		tileWorldSize: 1,
		tileWorldHeight: 0.5,
		chunkSize,
	};
}

// =============================================================================
// buildChunk
// =============================================================================

describe('buildChunk', () => {
	it('creates mesh for 4x4 chunk with all tiles filled', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		// 4×4 map, all tile ID=1
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.tileCount).toBe(16);
		expect(result.data.mesh).toBeInstanceOf(BABYLON.Mesh);
	});

	it('returns null for all empty tiles', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 0),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	it('counts only non-empty tiles', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		// 4×4 map, only 4 tiles filled
		const data: Num[] = Array.from({ length: 16 }, () => 0);
		data[0] = 1;
		data[5] = 1;
		data[10] = 1;
		data[15] = 1;
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [{ name: 'ground', type: 'ground', data, visible: true, opacity: 1 }],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.tileCount).toBe(4);
	});

	it('names mesh with chunk coordinates and layer name', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 2,
			chunkZ: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Chunk is out of bounds for a 4×4 map with chunkSize 4
		// (chunk 2,3 starts at x=8, z=12 which is beyond width=4)
		// So it should return null since all tiles are out of bounds
		expect(result.data).toBeNull();
	});

	it('creates named mesh for valid chunk position', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 8, 8);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		// 8×8 map → 2 chunks of 4 each
		const mapData: MapData = {
			width: 8,
			height: 8,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'upper1',
					type: 'upper1',
					data: Array.from({ length: 64 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 1,
			chunkZ: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.mesh.name).toBe('chunk-1-1-upper1');
	});
});

// =============================================================================
// buildCliffChunk
// =============================================================================

describe('buildCliffChunk', () => {
	it('creates cliff mesh when height differences exist', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const heightMap: Num[] = Array.from({ length: 16 }, () => 0);
		heightMap[5] = 2; // (1,1) raised
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
			heightMap,
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
			context: ctx,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.mesh).toBeInstanceOf(BABYLON.Mesh);
	});

	it('returns null for flat terrain (no height differences)', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
			heightMap: Array.from({ length: 16 }, () => 0),
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
			context: ctx,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	it('returns null when no heightMap provided', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
			context: ctx,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});
});

// =============================================================================
// rebuildChunk
// =============================================================================

describe('rebuildChunk', () => {
	it('disposes existing mesh and builds new one', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		// Build initial chunk
		const first: BabylonResult<ChunkMesh | null> = buildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.data).not.toBeNull();
		if (!first.data) return;
		const oldMesh: BABYLON.Mesh = first.data.mesh;

		// Rebuild with existing mesh
		const result: BabylonResult<ChunkMesh | null> = rebuildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
			existingMesh: oldMesh,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		// Old mesh should be disposed
		expect(oldMesh.isDisposed()).toBe(true);
		// New mesh should be a different instance
		expect(result.data.mesh).not.toBe(oldMesh);
	});

	it('works with null existing mesh', () => {
		const scene: BABYLON.Scene = setupEngine();
		const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
		const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
		const mapData: MapData = {
			width: 4,
			height: 4,
			tileWidth: 48,
			tileHeight: 48,
			tilesets: [config],
			layers: [
				{
					name: 'ground',
					type: 'ground',
					data: Array.from({ length: 16 }, () => 1),
					visible: true,
					opacity: 1,
				},
			],
		};
		const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

		const result: BabylonResult<ChunkMesh | null> = rebuildChunk({
			context: ctx,
			layerIndex: 0,
			chunkX: 0,
			chunkZ: 0,
			existingMesh: null,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
	});
});

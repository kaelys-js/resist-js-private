/**
 * Tests for tileset-loader — UV computation and tile ID resolution.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import type { TileUV } from './tile-geometry';
import {
	computeTileUVs,
	loadTileset,
	resolveGlobalTileId,
	type LoadedTileset,
	type ResolvedTile,
} from './tileset-loader';

// =============================================================================
// computeTileUVs
// =============================================================================

describe('computeTileUVs', () => {
	it('returns correct count for 4x4 grid', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 4,
			rows: 4,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(16);
	});

	it('computes UV for tile 0 (top-left) in 4x4 grid', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 4,
			rows: 4,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const uv: TileUV = result.data[0]!;
		const halfU: Num = 0.5 / (4 * 48);
		const halfV: Num = 0.5 / (4 * 48);

		// col=0, row=0 → u0=0, u1=0.25, v0=0.75, v1=1.0 (before inset)
		expect(uv.u0).toBeCloseTo(0 + halfU);
		expect(uv.u1).toBeCloseTo(0.25 - halfU);
		expect(uv.v0).toBeCloseTo(0.75 + halfV);
		expect(uv.v1).toBeCloseTo(1.0 - halfV);
	});

	it('computes UV for tile 15 (bottom-right) in 4x4 grid', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 4,
			rows: 4,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const uv: TileUV = result.data[15]!;
		const halfU: Num = 0.5 / (4 * 48);
		const halfV: Num = 0.5 / (4 * 48);

		// col=3, row=3 → u0=0.75, u1=1.0, v0=0, v1=0.25 (before inset)
		expect(uv.u0).toBeCloseTo(0.75 + halfU);
		expect(uv.u1).toBeCloseTo(1.0 - halfU);
		expect(uv.v0).toBeCloseTo(0 + halfV);
		expect(uv.v1).toBeCloseTo(0.25 - halfV);
	});

	it('computes UVs for 1x8 single-column grid', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 1,
			rows: 8,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(8);

		const halfU: Num = 0.5 / (1 * 48);
		const halfV: Num = 0.5 / (8 * 48);

		// Tile 0 (col=0, row=0): u0=0, u1=1, v0=0.875, v1=1.0
		const uv0: TileUV = result.data[0]!;
		expect(uv0.u0).toBeCloseTo(0 + halfU);
		expect(uv0.u1).toBeCloseTo(1.0 - halfU);
		expect(uv0.v0).toBeCloseTo(0.875 + halfV);
		expect(uv0.v1).toBeCloseTo(1.0 - halfV);

		// Tile 7 (col=0, row=7): u0=0, u1=1, v0=0, v1=0.125
		const uv7: TileUV = result.data[7]!;
		expect(uv7.u0).toBeCloseTo(0 + halfU);
		expect(uv7.u1).toBeCloseTo(1.0 - halfU);
		expect(uv7.v0).toBeCloseTo(0 + halfV);
		expect(uv7.v1).toBeCloseTo(0.125 - halfV);
	});

	it('computes UVs for 8x1 single-row grid', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 8,
			rows: 1,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(8);

		const halfU: Num = 0.5 / (8 * 48);
		const halfV: Num = 0.5 / (1 * 48);

		// Tile 0 (col=0, row=0): u0=0, u1=0.125, v0=0, v1=1
		const uv0: TileUV = result.data[0]!;
		expect(uv0.u0).toBeCloseTo(0 + halfU);
		expect(uv0.u1).toBeCloseTo(0.125 - halfU);
		expect(uv0.v0).toBeCloseTo(0 + halfV);
		expect(uv0.v1).toBeCloseTo(1.0 - halfV);

		// Tile 7 (col=7, row=0): u0=0.875, u1=1, v0=0, v1=1
		const uv7: TileUV = result.data[7]!;
		expect(uv7.u0).toBeCloseTo(0.875 + halfU);
		expect(uv7.u1).toBeCloseTo(1.0 - halfU);
		expect(uv7.v0).toBeCloseTo(0 + halfV);
		expect(uv7.v1).toBeCloseTo(1.0 - halfV);
	});

	it('applies half-pixel inset correctly', () => {
		// 2×2 grid with 16px tiles → halfU = 0.5/32 = 0.015625
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 2,
			rows: 2,
			tileWidth: 16,
			tileHeight: 16,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const halfU: Num = 0.5 / (2 * 16);
		const halfV: Num = 0.5 / (2 * 16);

		// Tile 0 (col=0, row=0): base u0=0, u1=0.5, v0=0.5, v1=1.0
		const uv: TileUV = result.data[0]!;
		expect(uv.u0).toBeCloseTo(halfU);
		expect(uv.u1).toBeCloseTo(0.5 - halfU);
		expect(uv.v0).toBeCloseTo(0.5 + halfV);
		expect(uv.v1).toBeCloseTo(1.0 - halfV);

		// Verify inset makes UV range slightly smaller than raw
		expect(uv.u1 - uv.u0).toBeLessThan(0.5);
		expect(uv.v1 - uv.v0).toBeLessThan(0.5);
	});

	it('returns UVs where u0 < u1 and v0 < v1 for all tiles', () => {
		const result: Result<readonly TileUV[]> = computeTileUVs({
			columns: 8,
			rows: 6,
			tileWidth: 48,
			tileHeight: 48,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		for (const uv of result.data) {
			expect(uv.u0).toBeLessThan(uv.u1);
			expect(uv.v0).toBeLessThan(uv.v1);
		}
	});
});

// =============================================================================
// loadTileset (NullEngine integration)
// =============================================================================

describe('loadTileset', () => {
	let instance: BabylonEngineInstance | null = null;

	afterEach(() => {
		if (instance) {
			disposeEngine(instance);
			instance = null;
		}
	});

	it('creates texture and populates uvLookup', () => {
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		expect(engineResult.ok).toBe(true);
		if (!engineResult.ok) return;
		instance = engineResult.data;

		const result: BabylonResult<LoadedTileset> = loadTileset({
			scene: instance.scene,
			config: {
				name: 'terrain',
				imagePath: 'tilesets/terrain.png',
				tileWidth: 48,
				tileHeight: 48,
				columns: 8,
				rows: 6,
				firstGid: 1,
				autotileType: 'none',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			basePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.texture).toBeInstanceOf(BABYLON.Texture);
		expect(result.data.uvLookup).toHaveLength(48); // 8 × 6
		expect(result.data.config.name).toBe('terrain');
	});

	it('populates correct number of UVs for smaller tileset', () => {
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		expect(engineResult.ok).toBe(true);
		if (!engineResult.ok) return;
		instance = engineResult.data;

		const result: BabylonResult<LoadedTileset> = loadTileset({
			scene: instance.scene,
			config: {
				name: 'small',
				imagePath: 'tilesets/small.png',
				tileWidth: 32,
				tileHeight: 32,
				columns: 4,
				rows: 4,
				firstGid: 1,
				autotileType: 'none',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			basePath: '',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.uvLookup).toHaveLength(16); // 4 × 4
	});

	it('expands 2×3 autotile source to 48 tiles when terrain_48', () => {
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		expect(engineResult.ok).toBe(true);
		if (!engineResult.ok) return;
		instance = engineResult.data;

		const result: BabylonResult<LoadedTileset> = loadTileset({
			scene: instance.scene,
			config: {
				name: 'grass',
				imagePath: 'autotile/terrain-00.png',
				tileWidth: 32,
				tileHeight: 32,
				columns: 2,
				rows: 3,
				firstGid: 1,
				autotileType: 'terrain_48',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			basePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Should have 48 UV entries (expanded from 2×3=6 to 8×6=48)
		expect(result.data.uvLookup).toHaveLength(48);
	});

	it('does not expand when autotileType is terrain_48 but grid is already 8×6', () => {
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		expect(engineResult.ok).toBe(true);
		if (!engineResult.ok) return;
		instance = engineResult.data;

		const result: BabylonResult<LoadedTileset> = loadTileset({
			scene: instance.scene,
			config: {
				name: 'expanded-grass',
				imagePath: 'autotile-expanded/terrain-00.png',
				tileWidth: 32,
				tileHeight: 32,
				columns: 8,
				rows: 6,
				firstGid: 1,
				autotileType: 'terrain_48',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			basePath: '/assets/',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Already 8×6, should use columns/rows as-is
		expect(result.data.uvLookup).toHaveLength(48);
	});

	it('UVs for expanded autotile match 8×6 grid UVs', () => {
		const engineResult: BabylonResult<BabylonEngineInstance> = createTestEngine();
		expect(engineResult.ok).toBe(true);
		if (!engineResult.ok) return;
		instance = engineResult.data;

		// Load as compact 2×3 autotile
		const compactResult: BabylonResult<LoadedTileset> = loadTileset({
			scene: instance.scene,
			config: {
				name: 'grass-compact',
				imagePath: 'autotile/terrain-00.png',
				tileWidth: 32,
				tileHeight: 32,
				columns: 2,
				rows: 3,
				firstGid: 1,
				autotileType: 'terrain_48',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			basePath: '/assets/',
		});
		expect(compactResult.ok).toBe(true);
		if (!compactResult.ok) return;

		// Compute reference UVs for 8×6 grid directly
		const refUvs: Result<readonly TileUV[]> = computeTileUVs({
			columns: 8,
			rows: 6,
			tileWidth: 32,
			tileHeight: 32,
		});
		expect(refUvs.ok).toBe(true);
		if (!refUvs.ok) return;

		// Should match exactly
		expect(compactResult.data.uvLookup).toHaveLength(refUvs.data.length);
		for (let i = 0; i < refUvs.data.length; i++) {
			const ref: TileUV = refUvs.data[i]!;
			const actual: TileUV = compactResult.data.uvLookup[i]!;
			expect(actual.u0).toBeCloseTo(ref.u0);
			expect(actual.u1).toBeCloseTo(ref.u1);
			expect(actual.v0).toBeCloseTo(ref.v0);
			expect(actual.v1).toBeCloseTo(ref.v1);
		}
	});
});

// =============================================================================
// resolveGlobalTileId
// =============================================================================

describe('resolveGlobalTileId', () => {
	/**
	 * Creates a minimal LoadedTileset stub for testing.
	 *
	 * @param name - Tileset name
	 * @param firstGid - First global tile ID
	 * @param columns - Number of columns
	 * @param rows - Number of rows
	 * @returns Stubbed LoadedTileset
	 */
	function stubTileset(name: string, firstGid: Num, columns: Num, rows: Num): LoadedTileset {
		return {
			config: {
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
			},
			texture: null as unknown as BABYLON.Texture,
			uvLookup: Array.from({ length: columns * rows }, () => ({
				u0: 0,
				v0: 0,
				u1: 1,
				v1: 1,
			})),
		};
	}

	it('returns null for ID 0 (empty tile)', () => {
		const tilesets: readonly LoadedTileset[] = [stubTileset('test', 1, 4, 4)];
		const result: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 0,
			tilesets,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	it('resolves valid ID in single tileset', () => {
		const tilesets: readonly LoadedTileset[] = [stubTileset('test', 1, 4, 4)];
		// firstGid=1, so ID 1 → local index 0, ID 5 → local index 4
		const result: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 5,
			tilesets,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.tileset.config.name).toBe('test');
		expect(result.data.localIndex).toBe(4);
	});

	it('resolves to correct tileset with multiple tilesets', () => {
		const tilesets: readonly LoadedTileset[] = [
			stubTileset('terrain', 1, 8, 6), // 48 tiles: IDs 1-48
			stubTileset('objects', 49, 4, 4), // 16 tiles: IDs 49-64
		];

		// ID 1 → terrain, local 0
		const r1: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 1,
			tilesets,
		});
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.data).not.toBeNull();
		if (!r1.data) return;
		expect(r1.data.tileset.config.name).toBe('terrain');
		expect(r1.data.localIndex).toBe(0);

		// ID 49 → objects, local 0
		const r2: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 49,
			tilesets,
		});
		expect(r2.ok).toBe(true);
		if (!r2.ok) return;
		expect(r2.data).not.toBeNull();
		if (!r2.data) return;
		expect(r2.data.tileset.config.name).toBe('objects');
		expect(r2.data.localIndex).toBe(0);

		// ID 60 → objects, local 11
		const r3: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 60,
			tilesets,
		});
		expect(r3.ok).toBe(true);
		if (!r3.ok) return;
		expect(r3.data).not.toBeNull();
		if (!r3.data) return;
		expect(r3.data.tileset.config.name).toBe('objects');
		expect(r3.data.localIndex).toBe(11);
	});

	it('resolves last tile in first tileset correctly', () => {
		const tilesets: readonly LoadedTileset[] = [
			stubTileset('terrain', 1, 8, 6), // 48 tiles: IDs 1-48
			stubTileset('objects', 49, 4, 4),
		];
		// ID 48 → terrain, local 47
		const result: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 48,
			tilesets,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).not.toBeNull();
		if (!result.data) return;
		expect(result.data.tileset.config.name).toBe('terrain');
		expect(result.data.localIndex).toBe(47);
	});

	it('returns null for ID beyond all tilesets', () => {
		const tilesets: readonly LoadedTileset[] = [stubTileset('test', 1, 4, 4)]; // 16 tiles: IDs 1-16
		const result: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 100,
			tilesets,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	it('resolves IDs correctly for expanded autotile tileset (uvLookup > config grid)', () => {
		// Simulate a terrain_48 tileset: config says 2×3 (6 tiles) but
		// uvLookup has 48 entries after expansion to 8×6.
		const autotileTileset: LoadedTileset = {
			config: {
				name: 'grass',
				imagePath: 'terrain-00.png',
				tileWidth: 32,
				tileHeight: 32,
				columns: 2,
				rows: 3,
				firstGid: 1,
				autotileType: 'terrain_48',
				animationFrames: 1,
				animationSpeed: 4,
				tileProperties: {},
			},
			texture: null as unknown as BABYLON.Texture,
			// 48 UV entries from autotile expansion
			uvLookup: Array.from({ length: 48 }, () => ({
				u0: 0,
				v0: 0,
				u1: 1,
				v1: 1,
			})),
		};
		const tilesets: readonly LoadedTileset[] = [
			autotileTileset,
			stubTileset('objects', 49, 4, 4), // 16 tiles: IDs 49-64
		];

		// ID 1 → grass, local 0
		const r1: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 1,
			tilesets,
		});
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.data).not.toBeNull();
		if (!r1.data) return;
		expect(r1.data.tileset.config.name).toBe('grass');
		expect(r1.data.localIndex).toBe(0);

		// ID 48 → grass, local 47 (last autotile frame)
		const r48: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 48,
			tilesets,
		});
		expect(r48.ok).toBe(true);
		if (!r48.ok) return;
		expect(r48.data).not.toBeNull();
		if (!r48.data) return;
		expect(r48.data.tileset.config.name).toBe('grass');
		expect(r48.data.localIndex).toBe(47);

		// ID 49 → objects, local 0
		const r49: BabylonResult<ResolvedTile | null> = resolveGlobalTileId({
			globalId: 49,
			tilesets,
		});
		expect(r49.ok).toBe(true);
		if (!r49.ok) return;
		expect(r49.data).not.toBeNull();
		if (!r49.data) return;
		expect(r49.data.tileset.config.name).toBe('objects');
		expect(r49.data.localIndex).toBe(0);
	});
});

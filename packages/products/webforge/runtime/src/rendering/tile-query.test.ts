/**
 * Tests for tile-query module.
 *
 * Verifies getTileProperties() correctly resolves global tile IDs to
 * their per-tile metadata (bush, counter, damageFloor, ladder, etc.)
 * from tileset configuration.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import type { Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

import type { TileProperties } from '../schemas/map-data';
import { getTileProperties } from './tile-query';
import { computeTileUVs, type LoadedTileset } from './tileset-loader';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a minimal LoadedTileset for testing.
 *
 * @param overrides - Partial TilesetConfig overrides.
 * @returns A LoadedTileset with defaults suitable for tests.
 */
function createTestTileset(overrides: {
	readonly name?: string;
	readonly firstGid?: number;
	readonly columns?: number;
	readonly rows?: number;
	readonly tileProperties?: Record<string, Record<string, unknown>>;
}): LoadedTileset {
	const columns: Num = overrides.columns ?? 8;
	const rows: Num = overrides.rows ?? 6;

	const uvResult: Result<ReadonlyArray<{ u0: number; v0: number; u1: number; v1: number }>> =
		computeTileUVs({
			columns,
			rows,
			tileWidth: 48,
			tileHeight: 48,
		});
	if (!uvResult.ok) throw new Error('UV computation failed in test helper');

	return {
		config: {
			name: overrides.name ?? 'test-tileset',
			imagePath: 'test.png',
			tileWidth: 48,
			tileHeight: 48,
			columns,
			rows,
			firstGid: overrides.firstGid ?? 1,
			autotileType: 'none',
			animationFrames: 1,
			animationSpeed: 4,
			tileProperties: (overrides.tileProperties ?? {}) as Record<string, TileProperties>,
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- NullEngine has no real texture
		texture: {} as any,
		uvLookup: uvResult.data,
	};
}

// =============================================================================
// getTileProperties
// =============================================================================

describe('getTileProperties', () => {
	test('returns correct properties for tile with bush flag', () => {
		const tileset: LoadedTileset = createTestTileset({
			firstGid: 1,
			tileProperties: {
				'3': { bush: true },
			},
		});

		// Global ID 4 → localIndex 3 (firstGid=1, so 4-1=3)
		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 4,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bush).toBe(true);
		expect(result.data.counter).toBe(false);
		expect(result.data.damageFloor).toBe(false);
		expect(result.data.ladder).toBe(false);
	});

	test('returns correct properties for tile with counter flag', () => {
		const tileset: LoadedTileset = createTestTileset({
			firstGid: 1,
			tileProperties: {
				'5': { counter: true, terrainTag: 3 },
			},
		});

		// Global ID 6 → localIndex 5
		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 6,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.counter).toBe(true);
		expect(result.data.terrainTag).toBe(3);
	});

	test('returns default properties for tile without properties entry', () => {
		const tileset: LoadedTileset = createTestTileset({
			firstGid: 1,
			tileProperties: {}, // No per-tile properties defined
		});

		// Global ID 2 → localIndex 1, which has no entry
		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 2,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bush).toBe(false);
		expect(result.data.counter).toBe(false);
		expect(result.data.damageFloor).toBe(false);
		expect(result.data.ladder).toBe(false);
		expect(result.data.terrainTag).toBe(0);
		expect(result.data.height).toBe(0);
		expect(result.data.passability).toEqual([true, true, true, true]);
	});

	test('returns default properties for tile ID 0 (empty)', () => {
		const tileset: LoadedTileset = createTestTileset({ firstGid: 1 });

		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 0,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Empty tile gets defaults
		expect(result.data.bush).toBe(false);
		expect(result.data.counter).toBe(false);
	});

	test('returns default properties for out-of-range tile ID', () => {
		const tileset: LoadedTileset = createTestTileset({
			firstGid: 1,
			columns: 2,
			rows: 2, // 4 tiles total, IDs 1–4
		});

		// Global ID 100 → out of range
		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 100,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bush).toBe(false);
		expect(result.data.counter).toBe(false);
	});

	test('resolves across multiple tilesets correctly', () => {
		const tileset1: LoadedTileset = createTestTileset({
			name: 'terrain',
			firstGid: 1,
			columns: 4,
			rows: 4, // 16 tiles: IDs 1–16
			tileProperties: {
				'0': { bush: true }, // globalId 1
			},
		});

		const tileset2: LoadedTileset = createTestTileset({
			name: 'objects',
			firstGid: 17,
			columns: 4,
			rows: 4, // 16 tiles: IDs 17–32
			tileProperties: {
				'2': { counter: true }, // globalId 19
			},
		});

		// Global ID 1 → tileset1, localIndex 0 → bush: true
		const result1: Result<TileProperties> = getTileProperties({
			tilesets: [tileset1, tileset2],
			globalTileId: 1,
		});
		expect(result1.ok).toBe(true);
		if (result1.ok) expect(result1.data.bush).toBe(true);

		// Global ID 19 → tileset2, localIndex 2 → counter: true
		const result2: Result<TileProperties> = getTileProperties({
			tilesets: [tileset1, tileset2],
			globalTileId: 19,
		});
		expect(result2.ok).toBe(true);
		if (result2.ok) expect(result2.data.counter).toBe(true);
	});

	test('returns all special flags when tile has multiple properties', () => {
		const tileset: LoadedTileset = createTestTileset({
			firstGid: 1,
			tileProperties: {
				'0': {
					bush: true,
					counter: true,
					damageFloor: true,
					ladder: true,
					terrainTag: 5,
					height: 3,
					passability: [false, true, true, false],
				},
			},
		});

		const result: Result<TileProperties> = getTileProperties({
			tilesets: [tileset],
			globalTileId: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.bush).toBe(true);
		expect(result.data.counter).toBe(true);
		expect(result.data.damageFloor).toBe(true);
		expect(result.data.ladder).toBe(true);
		expect(result.data.terrainTag).toBe(5);
		expect(result.data.height).toBe(3);
		expect(result.data.passability).toEqual([false, true, true, false]);
	});
});

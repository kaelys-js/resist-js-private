/**
 * Mega-atlas packing tests.
 *
 * Tests for multi-tileset packing into a single mega-atlas texture,
 * tile ID remapping, and power-of-2 atlas sizing.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import {
	calculateMegaAtlasLayout,
	remapTileIds,
	type MegaAtlasLayout,
	type TilesetEntry,
} from './tile-mega-atlas';

// =============================================================================
// calculateMegaAtlasLayout
// =============================================================================

describe('calculateMegaAtlasLayout', () => {
	it('returns layout for single tileset with POT dimensions', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 8, rows: 8, tileWidth: 16, tileHeight: 16, firstGid: 1 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		// Single tileset with POT pixel dims (128×128): matches exactly
		expect(layout.gridColumns).toBe(8);
		expect(layout.gridRows).toBe(8);
		expect(layout.tileWidth).toBe(16);
		expect(layout.tileHeight).toBe(16);
		expect(layout.totalTiles).toBe(64);
	});

	it('rounds up non-POT single tileset to POT grid', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 8, rows: 6, tileWidth: 16, tileHeight: 16, firstGid: 1 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		// 8*16=128 (POT) but 6*16=96 (not POT), rounds up
		expect(layout.totalTiles).toBe(48);
		// Grid should fit all 48 tiles with POT pixel dimensions
		expect(layout.gridColumns * layout.gridRows).toBeGreaterThanOrEqual(48);
		const pixelW: Num = layout.gridColumns * layout.tileWidth;
		const pixelH: Num = layout.gridRows * layout.tileHeight;
		expect(pixelW & (pixelW - 1)).toBe(0);
		expect(pixelH & (pixelH - 1)).toBe(0);
	});

	it('returns layout for two tilesets with same tile size', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 4, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 1 },
			{ tilesetIndex: 1, columns: 4, rows: 2, tileWidth: 16, tileHeight: 16, firstGid: 17 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		// Total tiles: 16 + 8 = 24
		expect(layout.totalTiles).toBe(24);
		// Grid should fit all 24 tiles
		expect(layout.gridColumns * layout.gridRows).toBeGreaterThanOrEqual(24);
	});

	it('produces power-of-2 pixel dimensions', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 10, rows: 10, tileWidth: 16, tileHeight: 16, firstGid: 1 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		const pixelW: Num = layout.gridColumns * layout.tileWidth;
		const pixelH: Num = layout.gridRows * layout.tileHeight;

		// Power-of-2 check
		expect(pixelW & (pixelW - 1)).toBe(0);
		expect(pixelH & (pixelH - 1)).toBe(0);
	});

	it('returns error for zero tilesets', () => {
		const result = calculateMegaAtlasLayout({ tilesets: [] });
		expect(result.ok).toBe(false);
	});

	it('creates remap table mapping global IDs to mega-atlas local IDs', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 4, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 1 },
			{ tilesetIndex: 1, columns: 4, rows: 2, tileWidth: 16, tileHeight: 16, firstGid: 17 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		// First tileset: global ID 1 → local ID 1 (starts at offset 0)
		expect(layout.remapTable.get(1)).toBe(1);
		// Second tileset: global ID 17 → offset by first tileset's count (16)
		expect(layout.remapTable.get(17)).toBe(17);
	});

	it('preserves tile placements for single tileset (offset 0)', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 8, rows: 8, tileWidth: 16, tileHeight: 16, firstGid: 1 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		// For a single POT tileset, global IDs map 1:1
		expect(layout.remapTable.get(1)).toBe(1);
		expect(layout.remapTable.get(64)).toBe(64);
	});

	it('stores per-tileset placement info', () => {
		const tilesets: readonly TilesetEntry[] = [
			{ tilesetIndex: 0, columns: 4, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 1 },
			{ tilesetIndex: 1, columns: 8, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 17 },
		];

		const result = calculateMegaAtlasLayout({ tilesets });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const layout: MegaAtlasLayout = result.data;
		expect(layout.placements.length).toBe(2);
		expect(layout.placements[0]?.tilesetIndex).toBe(0);
		expect(layout.placements[1]?.tilesetIndex).toBe(1);
	});
});

// =============================================================================
// remapTileIds
// =============================================================================

describe('remapTileIds', () => {
	it('preserves empty tile (0 → 0)', () => {
		const remapTable = new Map<Num, Num>([[1, 5]]);
		const tileIds: readonly Num[] = [0, 1, 0, 1];

		const result = remapTileIds({ tileIds, remapTable });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data[0]).toBe(0);
		expect(result.data[2]).toBe(0);
	});

	it('remaps non-empty tile IDs', () => {
		const remapTable = new Map<Num, Num>([
			[1, 10],
			[2, 20],
			[3, 30],
		]);
		const tileIds: readonly Num[] = [1, 2, 3, 0];

		const result = remapTileIds({ tileIds, remapTable });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data[0]).toBe(10);
		expect(result.data[1]).toBe(20);
		expect(result.data[2]).toBe(30);
		expect(result.data[3]).toBe(0);
	});

	it('passes through IDs not in remap table unchanged', () => {
		const remapTable = new Map<Num, Num>([[1, 5]]);
		const tileIds: readonly Num[] = [1, 99];

		const result = remapTileIds({ tileIds, remapTable });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data[0]).toBe(5);
		// ID 99 not in remap table — passes through unchanged
		expect(result.data[1]).toBe(99);
	});

	it('handles empty array', () => {
		const remapTable = new Map<Num, Num>();
		const tileIds: readonly Num[] = [];

		const result = remapTileIds({ tileIds, remapTable });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data.length).toBe(0);
	});

	it('returns a new array (does not mutate input)', () => {
		const remapTable = new Map<Num, Num>([[1, 5]]);
		const tileIds: Num[] = [1, 2];

		const result = remapTileIds({ tileIds, remapTable });
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Original array unchanged
		expect(tileIds[0]).toBe(1);
		expect(result.data[0]).toBe(5);
	});
});

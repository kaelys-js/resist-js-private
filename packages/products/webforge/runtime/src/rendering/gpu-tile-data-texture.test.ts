/**
 * GPU tile data texture tests.
 *
 * Tests for visual flag packing/unpacking, layer data building,
 * GPU data texture creation, single-tile updating, and height
 * data texture building.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import type { Num } from '@/schemas/common';

import type { BabylonResult } from '../core/babylon-result';

import {
	packVisualFlags,
	unpackVisualFlags,
	buildLayerData,
	buildHeightData,
	updateDataTextureTile,
	DEFAULT_VISUAL_FLAGS,
	type VisualFlags,
} from './gpu-tile-data-texture';

// =============================================================================
// packVisualFlags / unpackVisualFlags
// =============================================================================

describe('packVisualFlags', () => {
	test('packs all-zero flags to 0', () => {
		const flags: VisualFlags = {
			flipH: false,
			flipV: false,
			rotation: 0,
			opacity: 0,
			shadowDisable: false,
			glow: false,
			tintIndex: 0,
			animBase: 0,
			animCount: 0,
			bush: false,
		};
		const packed: Num = packVisualFlags(flags);
		expect(packed).toBe(0);
	});

	test('packs flipH at bit 0', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, flipH: true, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect(packed & 0x1).toBe(1);
	});

	test('packs flipV at bit 1', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, flipV: true, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 1) & 0x1).toBe(1);
	});

	test('packs rotation at bits 2-3', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, rotation: 3, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 2) & 0x3).toBe(3);
	});

	test('packs opacity at bits 4-7', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, opacity: 15 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 4) & 0xf).toBe(15);
	});

	test('packs shadowDisable at bit 8', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, shadowDisable: true, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 8) & 0x1).toBe(1);
	});

	test('packs glow at bit 9', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, glow: true, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 9) & 0x1).toBe(1);
	});

	test('packs tintIndex at bits 10-15', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, tintIndex: 42, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 10) & 0x3f).toBe(42);
	});

	test('packs animBase at bits 16-23', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, animBase: 200, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 16) & 0xff).toBe(200);
	});

	test('packs animCount at bits 24-27', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, animCount: 12, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 24) & 0xf).toBe(12);
	});

	test('packs bush at bit 28', () => {
		const flags: VisualFlags = { ...DEFAULT_VISUAL_FLAGS, bush: true, opacity: 0 };
		const packed: Num = packVisualFlags(flags);
		expect((packed >>> 28) & 0x1).toBe(1);
	});

	test('packs combined flags correctly', () => {
		const flags: VisualFlags = {
			flipH: true,
			flipV: true,
			rotation: 2,
			opacity: 10,
			shadowDisable: true,
			glow: true,
			tintIndex: 31,
			animBase: 50,
			animCount: 8,
			bush: true,
		};
		const packed: Num = packVisualFlags(flags);
		// Verify each field is recoverable
		expect(packed & 0x1).toBe(1); // flipH
		expect((packed >>> 1) & 0x1).toBe(1); // flipV
		expect((packed >>> 2) & 0x3).toBe(2); // rotation
		expect((packed >>> 4) & 0xf).toBe(10); // opacity
		expect((packed >>> 8) & 0x1).toBe(1); // shadowDisable
		expect((packed >>> 9) & 0x1).toBe(1); // glow
		expect((packed >>> 10) & 0x3f).toBe(31); // tintIndex
		expect((packed >>> 16) & 0xff).toBe(50); // animBase
		expect((packed >>> 24) & 0xf).toBe(8); // animCount
		expect((packed >>> 28) & 0x1).toBe(1); // bush
	});

	test('round-trips through unpack', () => {
		const original: VisualFlags = {
			flipH: true,
			flipV: false,
			rotation: 3,
			opacity: 7,
			shadowDisable: false,
			glow: true,
			tintIndex: 63,
			animBase: 255,
			animCount: 15,
			bush: true,
		};
		const packed: Num = packVisualFlags(original);
		const unpacked: VisualFlags = unpackVisualFlags(packed);
		expect(unpacked).toEqual(original);
	});

	test('round-trips zero flags', () => {
		const original: VisualFlags = {
			flipH: false,
			flipV: false,
			rotation: 0,
			opacity: 0,
			shadowDisable: false,
			glow: false,
			tintIndex: 0,
			animBase: 0,
			animCount: 0,
			bush: false,
		};
		const packed: Num = packVisualFlags(original);
		const unpacked: VisualFlags = unpackVisualFlags(packed);
		expect(unpacked).toEqual(original);
	});

	test('round-trips max flags', () => {
		const original: VisualFlags = {
			flipH: true,
			flipV: true,
			rotation: 3,
			opacity: 15,
			shadowDisable: true,
			glow: true,
			tintIndex: 63,
			animBase: 255,
			animCount: 15,
			bush: true,
		};
		const packed: Num = packVisualFlags(original);
		const unpacked: VisualFlags = unpackVisualFlags(packed);
		expect(unpacked).toEqual(original);
	});
});

describe('unpackVisualFlags', () => {
	test('unpacks 0 to all-false/zero', () => {
		const result: VisualFlags = unpackVisualFlags(0);
		expect(result.flipH).toBe(false);
		expect(result.flipV).toBe(false);
		expect(result.rotation).toBe(0);
		expect(result.opacity).toBe(0);
		expect(result.shadowDisable).toBe(false);
		expect(result.glow).toBe(false);
		expect(result.tintIndex).toBe(0);
		expect(result.animBase).toBe(0);
		expect(result.animCount).toBe(0);
		expect(result.bush).toBe(false);
	});

	test('unpacks default non-empty flags (0xF0)', () => {
		const result: VisualFlags = unpackVisualFlags(0xf0);
		expect(result.opacity).toBe(15);
		expect(result.flipH).toBe(false);
		expect(result.flipV).toBe(false);
		expect(result.rotation).toBe(0);
	});
});

// =============================================================================
// buildLayerData
// =============================================================================

describe('buildLayerData', () => {
	test('builds correct Float32Array for 2x2 map', () => {
		const tileIds: readonly Num[] = [1, 2, 3, 0];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 2,
			height: 2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 4 tiles × 4 channels (RGBA) = 16 uint32 values
		expect(result.data.length).toBe(16);
	});

	test('R channel contains tile IDs', () => {
		const tileIds: readonly Num[] = [5, 10, 0, 99];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 2,
			height: 2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// R channel at indices 0, 4, 8, 12
		expect(result.data[0]).toBe(5);
		expect(result.data[4]).toBe(10);
		expect(result.data[8]).toBe(0);
		expect(result.data[12]).toBe(99);
	});

	test('G channel contains default visual flags for non-empty tiles', () => {
		const tileIds: readonly Num[] = [1, 0];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 2,
			height: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Non-empty tile: G = 0xF0 (opacity=15)
		expect(result.data[1]).toBe(0xf0);
		// Empty tile: G = 0
		expect(result.data[5]).toBe(0);
	});

	test('B and A channels are zero', () => {
		const tileIds: readonly Num[] = [42];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 1,
			height: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data[2]).toBe(0); // B
		expect(result.data[3]).toBe(0); // A
	});

	test('empty tile has all zero channels', () => {
		const tileIds: readonly Num[] = [0];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 1,
			height: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data[0]).toBe(0); // R
		expect(result.data[1]).toBe(0); // G
		expect(result.data[2]).toBe(0); // B
		expect(result.data[3]).toBe(0); // A
	});

	test('rejects length mismatch', () => {
		const tileIds: readonly Num[] = [1, 2, 3]; // 3 tiles, but 2×2 = 4 expected
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 2,
			height: 2,
		});
		expect(result.ok).toBe(false);
	});

	test('accepts custom visual flags per tile', () => {
		const flags: Num = packVisualFlags({
			...DEFAULT_VISUAL_FLAGS,
			flipH: true,
			opacity: 10,
		});
		const tileIds: readonly Num[] = [7];
		const visualFlags: readonly Num[] = [flags];
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: 1,
			height: 1,
			visualFlags,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data[0]).toBe(7); // R = tile ID
		expect(result.data[1]).toBe(flags); // G = custom flags
	});

	test('handles large map (100x100)', () => {
		const size: Num = 100;
		const tileIds: Num[] = Array.from({ length: size * size }, () => 1);
		const result: BabylonResult<Float32Array<ArrayBufferLike>> = buildLayerData({
			tileIds,
			width: size,
			height: size,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.length).toBe(size * size * 4);
	});
});

// =============================================================================
// buildHeightData
// =============================================================================

describe('buildHeightData', () => {
	test('builds correct Float32Array for 2x2 map', () => {
		const heights: readonly Num[] = [0, 1, 2, 3];
		const result = buildHeightData({ heights, width: 2, height: 2 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeInstanceOf(Float32Array);
		expect(result.data.length).toBe(4);
	});

	test('stores height values', () => {
		const heights: readonly Num[] = [0.5, 1.5, 2.5, 3.5];
		const result = buildHeightData({ heights, width: 2, height: 2 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data[0]).toBeCloseTo(0.5);
		expect(result.data[1]).toBeCloseTo(1.5);
		expect(result.data[2]).toBeCloseTo(2.5);
		expect(result.data[3]).toBeCloseTo(3.5);
	});

	test('rejects length mismatch', () => {
		const heights: readonly Num[] = [1, 2, 3];
		const result = buildHeightData({ heights, width: 2, height: 2 });
		expect(result.ok).toBe(false);
	});

	test('handles flat map (all zeros)', () => {
		const heights: readonly Num[] = [0, 0, 0, 0];
		const result = buildHeightData({ heights, width: 2, height: 2 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data[0]).toBe(0);
		expect(result.data[3]).toBe(0);
	});

	test('handles 1x1 map', () => {
		const heights: readonly Num[] = [42.5];
		const result = buildHeightData({ heights, width: 1, height: 1 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.length).toBe(1);
		expect(result.data[0]).toBeCloseTo(42.5);
	});
});

// =============================================================================
// updateDataTextureTile
// =============================================================================

describe('updateDataTextureTile', () => {
	test('sets tile ID in R channel and default flags in G channel', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4); // 1x1 map
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: 0, y: 0, tileId: 42 });
		expect(data[0]).toBe(42); // R = tile ID
		expect(data[1]).toBe(0xf0); // G = default flags (opacity=15)
		expect(data[2]).toBe(0); // B = reserved
		expect(data[3]).toBe(0); // A = reserved
	});

	test('clears all channels for empty tile (tileId=0)', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		// Pre-fill with non-zero data
		data[0] = 99;
		data[1] = 0xf0;
		data[2] = 5;
		data[3] = 10;
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: 0, y: 0, tileId: 0 });
		expect(data[0]).toBe(0); // R = 0
		expect(data[1]).toBe(0); // G = 0
		expect(data[2]).toBe(0); // B = 0
		expect(data[3]).toBe(0); // A = 0
	});

	test('uses custom visual flags when provided', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		const customFlags: Num = 511;
		updateDataTextureTile({
			data,
			mapWidth: 1,
			mapHeight: 1,
			x: 0,
			y: 0,
			tileId: 7,
			visualFlags: customFlags,
		});
		expect(data[0]).toBe(7); // R = tile ID
		expect(data[1]).toBe(511); // G = custom flags
	});

	test('ignores out-of-bounds coordinates (negative x)', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: -1, y: 0, tileId: 42 });
		expect(data[0]).toBe(0); // Unchanged
	});

	test('ignores out-of-bounds coordinates (x >= mapWidth)', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: 1, y: 0, tileId: 42 });
		expect(data[0]).toBe(0); // Unchanged
	});

	test('ignores out-of-bounds coordinates (negative y)', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: 0, y: -1, tileId: 42 });
		expect(data[0]).toBe(0); // Unchanged
	});

	test('ignores out-of-bounds coordinates (y >= mapHeight)', () => {
		const data: Float32Array<ArrayBufferLike> = new Float32Array(4);
		updateDataTextureTile({ data, mapWidth: 1, mapHeight: 1, x: 0, y: 1, tileId: 42 });
		expect(data[0]).toBe(0); // Unchanged
	});

	test('updates correct tile in 2x2 map', () => {
		// 2x2 map = 4 tiles × 4 channels = 16 values
		const data: Float32Array<ArrayBufferLike> = new Float32Array(16);
		// Set tile at (1, 1) — index 3 (row 1 * width 2 + col 1)
		updateDataTextureTile({ data, mapWidth: 2, mapHeight: 2, x: 1, y: 1, tileId: 55 });
		// Offset = 3 * 4 = 12
		expect(data[12]).toBe(55); // R
		expect(data[13]).toBe(0xf0); // G
		// Other tiles should remain zero
		expect(data[0]).toBe(0);
		expect(data[4]).toBe(0);
		expect(data[8]).toBe(0);
	});

	test('updates corner tiles correctly', () => {
		// 3x3 map = 9 tiles × 4 channels = 36 values
		const data: Float32Array<ArrayBufferLike> = new Float32Array(36);
		// Top-left (0,0)
		updateDataTextureTile({ data, mapWidth: 3, mapHeight: 3, x: 0, y: 0, tileId: 1 });
		expect(data[0]).toBe(1);
		// Bottom-right (2,2) — index 8, offset 32
		updateDataTextureTile({ data, mapWidth: 3, mapHeight: 3, x: 2, y: 2, tileId: 9 });
		expect(data[32]).toBe(9);
		expect(data[33]).toBe(0xf0);
	});
});

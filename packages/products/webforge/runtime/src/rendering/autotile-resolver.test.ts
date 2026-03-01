/**
 * Tests for autotile-resolver — bitmask building, reduction, frame lookup.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

import {
	bitmaskToFrameIndex,
	bitmaskToWallIndex,
	buildAdjacencyBitmask,
	reduceBitmask,
	resolveAutotile,
} from './autotile-resolver';

// =============================================================================
// Bit Constants (precomputed to avoid bitwise warnings in tests)
// =============================================================================

const BIT_N: Num = 0x01;
const BIT_NE: Num = 0x02;
const BIT_E: Num = 0x04;
const BIT_SE: Num = 0x08;
const BIT_S: Num = 0x10;
const BIT_SW: Num = 0x20;
const BIT_W: Num = 0x40;
const BIT_NW: Num = 0x80;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates a flat row-major grid filled with a single tile ID.
 *
 * @param width - Grid width in tiles
 * @param height - Grid height in tiles
 * @param fillId - Tile ID to fill every cell with
 * @returns Flat row-major array of tile IDs
 */
function createGrid(width: Num, height: Num, fillId: Num): readonly Num[] {
	return Array.from({ length: width * height }, () => fillId);
}

// =============================================================================
// buildAdjacencyBitmask
// =============================================================================

describe('buildAdjacencyBitmask', () => {
	it('returns 0xFF when all 8 neighbors match', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0xff);
	});

	it('returns 0x00 when no neighbors match', () => {
		const data: readonly Num[] = [2, 2, 2, 2, 1, 2, 2, 2, 2];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0x00);
	});

	it('sets only N bit when only north neighbor matches', () => {
		// Row 0: [2,1,2], Row 1: [2,1,2], Row 2: [2,2,2]
		const data: readonly Num[] = [2, 1, 2, 2, 1, 2, 2, 2, 2];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N);
	});

	it('sets N+E bits when north and east match', () => {
		// Row 0: [2,1,2], Row 1: [2,1,1], Row 2: [2,2,2]
		const data: readonly Num[] = [2, 1, 2, 2, 1, 1, 2, 2, 2];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N + BIT_E);
	});

	it('sets N+NE+E bits when those three neighbors match', () => {
		// Row 0: [2,1,1], Row 1: [2,1,1], Row 2: [2,2,2]
		const data: readonly Num[] = [2, 1, 1, 2, 1, 1, 2, 2, 2];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N + BIT_NE + BIT_E);
	});

	it('treats out-of-bounds as matching at corner (0,0)', () => {
		const data: readonly Num[] = [1, 1, 1, 1];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 0,
			y: 0,
			mapWidth: 2,
			mapHeight: 2,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0xff);
	});

	it('treats out-of-bounds as matching on left edge', () => {
		// 3x3, checking (0,1). Row 0: [2,2,2], Row 1: [1,2,2], Row 2: [2,2,2]
		const data: readonly Num[] = [2, 2, 2, 1, 2, 2, 2, 2, 2];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 0,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// NW, W, SW are OOB → match; all in-bounds neighbors are 2 → no match
		expect(result.data).toBe(BIT_NW + BIT_W + BIT_SW);
	});

	it('treats empty tiles (ID=0) as non-matching', () => {
		const data: readonly Num[] = [0, 0, 0, 0, 1, 0, 0, 0, 0];
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0x00);
	});

	it('handles larger map with specific neighbor pattern', () => {
		const data: Num[] = Array.from({ length: 25 }, () => 2);
		data[12] = 1; // Center (2,2)
		data[7] = 1; // N: (2,1)
		data[13] = 1; // E: (3,2)
		data[17] = 1; // S: (2,3)
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 2,
			y: 2,
			mapWidth: 5,
			mapHeight: 5,
			layerData: data,
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N + BIT_E + BIT_S);
	});

	it('handles 1x1 map where all neighbors are out of bounds', () => {
		const result: Result<Num> = buildAdjacencyBitmask({
			x: 0,
			y: 0,
			mapWidth: 1,
			mapHeight: 1,
			layerData: [1],
			tileId: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0xff);
	});
});

// =============================================================================
// reduceBitmask
// =============================================================================

describe('reduceBitmask', () => {
	it('preserves all corners when all 4 edges are set', () => {
		const result: Result<Num> = reduceBitmask(0xff);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0xff);
	});

	it('clears all corners when no edges are set', () => {
		const cornersOnly: Num = BIT_NE + BIT_SE + BIT_SW + BIT_NW;
		const result: Result<Num> = reduceBitmask(cornersOnly);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('preserves NE when both N and E are set', () => {
		const bitmask: Num = BIT_N + BIT_NE + BIT_E;
		const result: Result<Num> = reduceBitmask(bitmask);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N + BIT_NE + BIT_E);
	});

	it('clears NE when N is not set', () => {
		const result: Result<Num> = reduceBitmask(BIT_NE + BIT_E);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_E);
	});

	it('clears NE when E is not set', () => {
		const result: Result<Num> = reduceBitmask(BIT_N + BIT_NE);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N);
	});

	it('clears SE when S is not set', () => {
		const result: Result<Num> = reduceBitmask(BIT_SE + BIT_E);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_E);
	});

	it('clears SW when W is not set', () => {
		const result: Result<Num> = reduceBitmask(BIT_SW + BIT_S);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_S);
	});

	it('clears NW when W is not set', () => {
		const result: Result<Num> = reduceBitmask(BIT_NW + BIT_N);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N);
	});

	it('returns 0 for isolated tile', () => {
		const result: Result<Num> = reduceBitmask(0);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('preserves edges without corners unchanged', () => {
		const edgesOnly: Num = BIT_N + BIT_E + BIT_S + BIT_W;
		const result: Result<Num> = reduceBitmask(edgesOnly);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(edgesOnly);
	});

	it('selectively preserves valid corners and clears invalid', () => {
		// N+E → NE valid; S set but W not → SW invalid
		const bitmask: Num = BIT_N + BIT_NE + BIT_E + BIT_S + BIT_SW;
		const result: Result<Num> = reduceBitmask(bitmask);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(BIT_N + BIT_NE + BIT_E + BIT_S);
	});
});

// =============================================================================
// bitmaskToFrameIndex
// =============================================================================

describe('bitmaskToFrameIndex', () => {
	it('returns frame 46 for isolated tile (bitmask 0)', () => {
		const result: Result<Num> = bitmaskToFrameIndex(0);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(46);
	});

	it('returns frame 0 for fully surrounded tile (bitmask 0xFF)', () => {
		const result: Result<Num> = bitmaskToFrameIndex(0xff);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('returns frame 44 for N-only bitmask', () => {
		const result: Result<Num> = bitmaskToFrameIndex(BIT_N);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(44);
	});

	it('returns correct frame indices for all single-cardinal bitmasks', () => {
		// RPG Maker MZ ordering: S=42, E=43, N=44, W=45
		const expected: ReadonlyArray<[Num, Num]> = [
			[BIT_N, 44],
			[BIT_E, 43],
			[BIT_S, 42],
			[BIT_W, 45],
		];
		for (const [bit, frame] of expected) {
			const result: Result<Num> = bitmaskToFrameIndex(bit);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toBe(frame);
		}
	});

	it('returns frame 15 for all-cardinals-no-diagonals (0x55)', () => {
		const result: Result<Num> = bitmaskToFrameIndex(0x55);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(15);
	});

	it('masks input to 8 bits', () => {
		const result: Result<Num> = bitmaskToFrameIndex(0x1_00);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(46);
	});
});

// =============================================================================
// bitmaskToWallIndex
// =============================================================================

describe('bitmaskToWallIndex', () => {
	it('returns 0 when no cardinal neighbors match', () => {
		const result: Result<Num> = bitmaskToWallIndex(0);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('returns 15 when all 4 cardinals match', () => {
		const bitmask: Num = BIT_N + BIT_E + BIT_S + BIT_W;
		const result: Result<Num> = bitmaskToWallIndex(bitmask);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(15);
	});

	it('returns 1 for N-only', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_N);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(1);
	});

	it('returns 2 for E-only', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_E);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(2);
	});

	it('returns 4 for S-only', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_S);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(4);
	});

	it('returns 8 for W-only', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_W);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(8);
	});

	it('returns 5 for N+S corridor', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_N + BIT_S);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(5);
	});

	it('returns 10 for E+W corridor', () => {
		const result: Result<Num> = bitmaskToWallIndex(BIT_E + BIT_W);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(10);
	});

	it('ignores diagonal bits in 8-bit bitmask', () => {
		const result: Result<Num> = bitmaskToWallIndex(0xff);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(15);
	});
});

// =============================================================================
// resolveAutotile
// =============================================================================

describe('resolveAutotile', () => {
	it('returns 0 for autotile type none regardless of neighbors', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'none',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('returns frame 46 for isolated terrain_48 tile', () => {
		const data: readonly Num[] = [2, 2, 2, 2, 1, 2, 2, 2, 2];
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(46);
	});

	it('returns frame 0 for fully surrounded terrain_48', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('returns 15 for fully surrounded wall_16 tile', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'wall_16',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(15);
	});

	it('returns 0 for isolated wall_16 tile', () => {
		const data: readonly Num[] = [2, 2, 2, 2, 1, 2, 2, 2, 2];
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'wall_16',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(0);
	});

	it('produces different results for terrain_48 vs wall_16', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const terrain: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		const wall: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'wall_16',
		});
		expect(terrain.ok).toBe(true);
		expect(wall.ok).toBe(true);
		if (!terrain.ok || !wall.ok) return;
		expect(terrain.data).not.toBe(wall.data);
	});

	it('animated_terrain produces same result as terrain_48', () => {
		const data: readonly Num[] = createGrid(3, 3, 1);
		const terrain: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		const animated: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'animated_terrain',
		});
		expect(terrain.ok).toBe(true);
		expect(animated.ok).toBe(true);
		if (!terrain.ok || !animated.ok) return;
		expect(animated.data).toBe(terrain.data);
	});

	it('1x1 map matches fully surrounded 3x3 result', () => {
		const single: Result<Num> = resolveAutotile({
			x: 0,
			y: 0,
			mapWidth: 1,
			mapHeight: 1,
			layerData: [1],
			tileId: 1,
			autotileType: 'terrain_48',
		});
		const surrounded: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: createGrid(3, 3, 1),
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(single.ok).toBe(true);
		expect(surrounded.ok).toBe(true);
		if (!single.ok || !surrounded.ok) return;
		expect(single.data).toBe(surrounded.data);
	});

	it('returns frame 44 for N-only terrain_48', () => {
		const data: readonly Num[] = [2, 1, 2, 2, 1, 2, 2, 2, 2];
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(44);
	});

	it('returns frame 41 for N+E without corner', () => {
		// N+E match, NE does not → bitmask 0x05 → reduced 0x05
		const data: readonly Num[] = [2, 1, 2, 2, 1, 1, 2, 2, 2];
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(41);
	});

	it('returns frame 40 for N+NE+E with corner', () => {
		// N+NE+E match → bitmask 0x07 → NE preserved → reduced 0x07
		const data: readonly Num[] = [2, 1, 1, 2, 1, 1, 2, 2, 2];
		const result: Result<Num> = resolveAutotile({
			x: 1,
			y: 1,
			mapWidth: 3,
			mapHeight: 3,
			layerData: data,
			tileId: 1,
			autotileType: 'terrain_48',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBe(40);
	});
});

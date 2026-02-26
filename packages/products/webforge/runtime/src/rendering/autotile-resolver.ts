/**
 * Autotile resolver — pure algorithm for neighbor-based tile pattern selection.
 *
 * Implements WebForge's custom autotile format:
 * - `'terrain_48'` — 8-neighbor bitmask → 48 visual patterns
 * - `'wall_16'` — 4-neighbor bitmask → 16 visual patterns
 * - `'animated_terrain'` — Same as terrain_48, animation handled by tile-animator
 * - `'none'` — No neighbor analysis, returns tile index directly
 *
 * @example
 * ```typescript
 * import { resolveAutotile } from './autotile-resolver';
 *
 * const result = resolveAutotile({
 *   x: 5, y: 3, mapWidth: 32, mapHeight: 32,
 *   layerData: mapData.layers[0].data, tileId: 1,
 *   autotileType: 'terrain_48',
 * });
 * if (result.ok) {
 *   result.data; // pattern index 0–47
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { okUnchecked, type Result } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import { AutotileTypeSchema } from '../schemas/map-data';

// =============================================================================
// Schemas
// =============================================================================

/** Options schema for {@link resolveAutotile}. */
export const ResolveAutotileOptionsSchema = v.pipe(
	v.strictObject({
		/** Tile X position in the map grid. */
		x: v.number(),
		/** Tile Y position in the map grid. */
		y: v.number(),
		/** Map width in tiles. */
		mapWidth: v.number(),
		/** Map height in tiles. */
		mapHeight: v.number(),
		/** Flat row-major array of tile IDs for this layer. */
		layerData: v.pipe(v.array(v.number()), v.readonly()),
		/** The tile ID to match neighbors against. */
		tileId: v.number(),
		/** Autotile behavior type. */
		autotileType: AutotileTypeSchema,
	}),
	v.readonly(),
);

/** Options for {@link resolveAutotile}. */
export type ResolveAutotileOptions = v.InferOutput<typeof ResolveAutotileOptionsSchema>;

/** Options schema for {@link buildAdjacencyBitmask}. */
export const AdjacencyOptionsSchema = v.pipe(
	v.strictObject({
		/** Tile X position in the map grid. */
		x: v.number(),
		/** Tile Y position in the map grid. */
		y: v.number(),
		/** Map width in tiles. */
		mapWidth: v.number(),
		/** Map height in tiles. */
		mapHeight: v.number(),
		/** Flat row-major array of tile IDs for this layer. */
		layerData: v.pipe(v.array(v.number()), v.readonly()),
		/** The tile ID to match neighbors against. */
		tileId: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link buildAdjacencyBitmask}. */
export type AdjacencyOptions = v.InferOutput<typeof AdjacencyOptionsSchema>;

// =============================================================================
// Bitmask Bit Positions
// =============================================================================

/**
 * 8-neighbor bit positions in the adjacency bitmask.
 *
 * ```
 * NW(7)  N(0)  NE(1)
 * W(6)   TILE  E(2)
 * SW(5)  S(4)  SE(3)
 * ```
 */
const BIT_N: Num = 0;
const BIT_NE: Num = 1;
const BIT_E: Num = 2;
const BIT_SE: Num = 3;
const BIT_S: Num = 4;
const BIT_SW: Num = 5;
const BIT_W: Num = 6;
const BIT_NW: Num = 7;

// =============================================================================
// 48-Pattern Lookup Table
// =============================================================================

/**
 * Maps reduced 8-bit bitmask → terrain_48 pattern index (0–47).
 *
 * After corner reduction, there are exactly 48 unique visual patterns.
 * This lookup table maps each possible reduced bitmask value to its
 * corresponding pattern index in the tileset grid.
 *
 * The 256-entry table is sparse — many bitmask values map to the same
 * pattern because corner bits are masked out when adjacent edges aren't set.
 */
// prettier-ignore
const BITMASK_TO_FRAME: readonly Num[] = [
	// Generated from the 48 unique neighbor configurations.
	// Index = reduced bitmask value, Value = pattern index 0–47
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13,
	13, 15, 15, 2, 3, 2, 3, 16, 17, 16, 17, 10, 11, 10, 11, 18, 19, 18, 19, 3, 3, 3, 3, 17, 17, 17,
	17, 11, 11, 11, 11, 19, 19, 19, 19, 4, 5, 16, 17, 4, 5, 16, 17, 20, 21, 22, 23, 20, 21, 22, 23, 5,
	5, 17, 17, 5, 5, 17, 17, 21, 21, 23, 23, 21, 21, 23, 23, 6, 7, 16, 17, 16, 17, 24, 25, 26, 27, 22,
	23, 28, 29, 30, 31, 7, 7, 17, 17, 17, 17, 25, 25, 27, 27, 23, 23, 29, 29, 31, 31, 8, 9, 10, 11,
	20, 21, 26, 27, 8, 9, 10, 11, 20, 21, 26, 27, 9, 9, 11, 11, 21, 21, 27, 27, 9, 9, 11, 11, 21, 21,
	27, 27, 10, 11, 10, 11, 22, 23, 22, 23, 10, 11, 10, 11, 22, 23, 22, 23, 11, 11, 11, 11, 23, 23,
	23, 23, 11, 11, 11, 11, 23, 23, 23, 23, 12, 13, 18, 19, 20, 21, 28, 29, 20, 21, 22, 23, 32, 33,
	34, 35, 13, 13, 19, 19, 21, 21, 29, 29, 21, 21, 23, 23, 33, 33, 35, 35, 14, 15, 18, 19, 22, 23,
	30, 31, 26, 27, 22, 23, 36, 37, 38, 39, 15, 15, 19, 19, 23, 23, 31, 31, 27, 27, 23, 23, 37, 37,
	39, 39,
];

/**
 * Maps 4-bit wall bitmask → wall_16 pattern index (0–15).
 *
 * Bit positions: N=0, E=1, S=2, W=3.
 * 16 entries, one per possible 4-bit combination.
 */
// prettier-ignore
const WALL_BITMASK_TO_FRAME: readonly Num[] = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

// =============================================================================
// Adjacency Bitmask
// =============================================================================

/**
 * Builds an 8-bit adjacency bitmask for a tile based on its 8 neighbors.
 *
 * A bit is set (1) if the neighbor has the same tile ID or is out-of-bounds
 * (map edges are treated as matching). A bit is clear (0) if the neighbor
 * has a different ID or is empty (ID=0).
 *
 * @param options - Adjacency calculation options
 * @returns Result containing the 8-bit bitmask (0x00–0xFF)
 *
 * @example
 * ```typescript
 * // 3×3 grid, center tile is ID 1, all neighbors match
 * const result = buildAdjacencyBitmask({
 *   x: 1, y: 1, mapWidth: 3, mapHeight: 3,
 *   layerData: [1,1,1, 1,1,1, 1,1,1], tileId: 1,
 * });
 * if (result.ok) result.data; // 0xFF (all 8 neighbors match)
 * ```
 */
export function buildAdjacencyBitmask(options: AdjacencyOptions): Result<Num> {
	const { x, y, mapWidth, mapHeight, layerData, tileId } = options;

	let bitmask: Num = 0;

	// Check each of 8 neighbors
	const offsets: ReadonlyArray<[Num, Num, Num]> = [
		[0, -1, BIT_N], // North
		[1, -1, BIT_NE], // Northeast
		[1, 0, BIT_E], // East
		[1, 1, BIT_SE], // Southeast
		[0, 1, BIT_S], // South
		[-1, 1, BIT_SW], // Southwest
		[-1, 0, BIT_W], // West
		[-1, -1, BIT_NW], // Northwest
	];

	for (const [dx, dy, bit] of offsets) {
		const nx: Num = x + dx;
		const ny: Num = y + dy;

		if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) {
			// Out-of-bounds = matching (seamless map edges)
			bitmask |= 1 << bit;
		} else {
			const neighborId: Num = layerData[ny * mapWidth + nx] ?? 0;
			if (neighborId === tileId) {
				bitmask |= 1 << bit;
			}
		}
	}

	return okUnchecked(bitmask);
}

// =============================================================================
// Bitmask Reduction
// =============================================================================

/**
 * Reduces an 8-bit bitmask by clearing corner bits that don't matter.
 *
 * A corner bit only counts when both adjacent edge neighbors are set:
 * - NE is cleared unless both N and E are set
 * - SE is cleared unless both S and E are set
 * - SW is cleared unless both S and W are set
 * - NW is cleared unless both N and W are set
 *
 * This reduces 256 possible bitmasks to 48 unique visual patterns.
 *
 * @param bitmask - Raw 8-bit adjacency bitmask
 * @returns Result containing the reduced bitmask
 */
export function reduceBitmask(bitmask: Num): Result<Num> {
	let reduced: Num = bitmask;

	const hasN: boolean = (bitmask & (1 << BIT_N)) !== 0;
	const hasE: boolean = (bitmask & (1 << BIT_E)) !== 0;
	const hasS: boolean = (bitmask & (1 << BIT_S)) !== 0;
	const hasW: boolean = (bitmask & (1 << BIT_W)) !== 0;

	// Clear corner bits when adjacent edges aren't both set
	if (!(hasN && hasE)) reduced &= ~(1 << BIT_NE);
	if (!(hasS && hasE)) reduced &= ~(1 << BIT_SE);
	if (!(hasS && hasW)) reduced &= ~(1 << BIT_SW);
	if (!(hasN && hasW)) reduced &= ~(1 << BIT_NW);

	return okUnchecked(reduced);
}

// =============================================================================
// Frame Index Lookup
// =============================================================================

/**
 * Maps a reduced bitmask to a terrain_48 frame index (0–47).
 *
 * @param reducedBitmask - Bitmask after corner reduction
 * @returns Result containing the pattern index
 */
export function bitmaskToFrameIndex(reducedBitmask: Num): Result<Num> {
	const index: Num = reducedBitmask & 0xff;
	const frame: Num = BITMASK_TO_FRAME[index] ?? 0;
	return okUnchecked(frame);
}

/**
 * Maps a 4-bit wall bitmask to a wall_16 frame index (0–15).
 *
 * @param bitmask - 8-bit adjacency bitmask (only cardinal bits used)
 * @returns Result containing the wall pattern index
 */
export function bitmaskToWallIndex(bitmask: Num): Result<Num> {
	// Extract only cardinal bits: N(0), E(2), S(4), W(6)
	// Remap to 4-bit: N=bit0, E=bit1, S=bit2, W=bit3
	let wallBits: Num = 0;
	if (bitmask & (1 << BIT_N)) wallBits |= 1;
	if (bitmask & (1 << BIT_E)) wallBits |= 2;
	if (bitmask & (1 << BIT_S)) wallBits |= 4;
	if (bitmask & (1 << BIT_W)) wallBits |= 8;

	const frame: Num = WALL_BITMASK_TO_FRAME[wallBits] ?? 0;
	return okUnchecked(frame);
}

// =============================================================================
// Resolve Autotile
// =============================================================================

/**
 * Resolves the autotile pattern index for a tile at the given position.
 *
 * Combines neighbor analysis, bitmask reduction, and frame lookup into
 * a single call. Returns the pattern index that maps to a tile position
 * in the autotile tileset grid.
 *
 * @param options - Autotile resolution options
 * @returns Result containing the pattern index
 *
 * @example
 * ```typescript
 * const result = resolveAutotile({
 *   x: 5, y: 3, mapWidth: 32, mapHeight: 32,
 *   layerData: mapData.layers[0].data, tileId: 1,
 *   autotileType: 'terrain_48',
 * });
 * ```
 */
export function resolveAutotile(options: ResolveAutotileOptions): Result<Num> {
	const { autotileType, ...adjacencyOptions } = options;

	if (autotileType === 'none') {
		return okUnchecked(0);
	}

	const bitmaskResult: Result<Num> = buildAdjacencyBitmask(adjacencyOptions);
	if (!bitmaskResult.ok) return bitmaskResult;

	if (autotileType === 'wall_16') {
		return bitmaskToWallIndex(bitmaskResult.data);
	}

	// terrain_48 or animated_terrain
	const reducedResult: Result<Num> = reduceBitmask(bitmaskResult.data);
	if (!reducedResult.ok) return reducedResult;

	return bitmaskToFrameIndex(reducedResult.data);
}

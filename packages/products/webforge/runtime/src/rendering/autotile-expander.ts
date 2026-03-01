/**
 * Autotile expander — converts compact RPG Maker A2 autotile sources (2×3 tiles)
 * into expanded 48-tile grids using sub-tile composition.
 *
 * The RPG Maker A2 format stores each terrain type as a 2-tile × 3-tile block.
 * Each tile is divided into 4 quarter-tiles (16×16 for 32px tiles), forming a
 * 4×6 sub-tile grid. The {@link FLOOR_AUTOTILE_TABLE} defines how to compose
 * 48 unique tile patterns from these 24 sub-tiles.
 *
 * Uses {@link PixelBuffer} instead of `ImageData` so the module works in both
 * Node.js (tests) and browser (runtime) environments. A browser `ImageData` is
 * structurally compatible and can be passed directly.
 *
 * @example
 * ```typescript
 * import { expandAutotileSource } from './autotile-expander';
 * import type { PixelBuffer } from './autotile-expander';
 *
 * // Load a 64×96 source image (2 tiles × 3 tiles at 32px)
 * const sourceData: PixelBuffer = getImageData(sourceImage);
 * const result = expandAutotileSource(sourceData, 32);
 * if (result.ok) {
 *   // result.data is a 256×192 PixelBuffer (8×6 tiles at 32px)
 *   createTextureFromPixelBuffer(result.data);
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// PixelBuffer Schema
// =============================================================================

/**
 * Platform-agnostic pixel buffer — structurally identical to `ImageData` but
 * without depending on the browser global. Any `ImageData` instance satisfies
 * this interface via structural typing.
 *
 * @example
 * ```typescript
 * // In Node.js tests:
 * const buf: PixelBuffer = {
 *   width: 64,
 *   height: 96,
 *   data: new Uint8ClampedArray(64 * 96 * 4),
 * };
 *
 * // In browser (ImageData is structurally compatible):
 * const ctx = canvas.getContext('2d')!;
 * const buf: PixelBuffer = ctx.getImageData(0, 0, 64, 96);
 * ```
 */
export const PixelBufferSchema = v.pipe(
	v.strictObject({
		/** Image width in pixels. */
		width: v.number(),
		/** Image height in pixels. */
		height: v.number(),
		/** RGBA pixel data (4 bytes per pixel, row-major). */
		data: v.custom<Uint8ClampedArray>((val) => val instanceof Uint8ClampedArray),
	}),
	v.readonly(),
);

/** Platform-agnostic pixel buffer type. */
export type PixelBuffer = v.InferOutput<typeof PixelBufferSchema>;

// =============================================================================
// FLOOR_AUTOTILE_TABLE
// =============================================================================

/**
 * RPG Maker MZ FLOOR_AUTOTILE_TABLE — maps shape index (0–47) to four
 * sub-tile coordinates `[col, row]` in the 4×6 quarter-tile grid.
 *
 * Each entry defines the composition of one output tile:
 * `[[TL_col, TL_row], [TR_col, TR_row], [BL_col, BL_row], [BR_col, BR_row]]`
 *
 * Shape ordering matches the {@link BITMASK_TO_FRAME} table in `autotile-resolver.ts`:
 * - Shape 0 = fully surrounded (all 8 neighbors match)
 * - Shapes 1–15 = all 4 cardinals, varying diagonal combinations
 * - Shapes 16–31 = missing one cardinal edge
 * - Shapes 32–33 = corridors (N+S, E+W)
 * - Shapes 34–41 = two adjacent cardinals (outer corners)
 * - Shapes 42–45 = single cardinal (peninsulas)
 * - Shape 46 = isolated (outer corners)
 * - Shape 47 = isolated (cross/preview sub-tiles)
 *
 * Source: RPG Maker MZ Tilemap.js (rpgmakerofficial.com)
 */
// prettier-ignore
export const FLOOR_AUTOTILE_TABLE: ReadonlyArray<ReadonlyArray<readonly [Num, Num]>> = [
	[
		[2, 4],
		[1, 4],
		[2, 3],
		[1, 3],
	], //  0: fully surrounded
	[
		[2, 0],
		[1, 4],
		[2, 3],
		[1, 3],
	], //  1: missing NW corner
	[
		[2, 4],
		[3, 0],
		[2, 3],
		[1, 3],
	], //  2: missing NE corner
	[
		[2, 0],
		[3, 0],
		[2, 3],
		[1, 3],
	], //  3: missing NW+NE corners
	[
		[2, 4],
		[1, 4],
		[2, 3],
		[3, 1],
	], //  4: missing SE corner
	[
		[2, 0],
		[1, 4],
		[2, 3],
		[3, 1],
	], //  5: missing NW+SE corners
	[
		[2, 4],
		[3, 0],
		[2, 3],
		[3, 1],
	], //  6: missing NE+SE corners
	[
		[2, 0],
		[3, 0],
		[2, 3],
		[3, 1],
	], //  7: missing NW+NE+SE corners
	[
		[2, 4],
		[1, 4],
		[2, 1],
		[1, 3],
	], //  8: missing SW corner
	[
		[2, 0],
		[1, 4],
		[2, 1],
		[1, 3],
	], //  9: missing NW+SW corners
	[
		[2, 4],
		[3, 0],
		[2, 1],
		[1, 3],
	], // 10: missing NE+SW corners
	[
		[2, 0],
		[3, 0],
		[2, 1],
		[1, 3],
	], // 11: missing NW+NE+SW corners
	[
		[2, 4],
		[1, 4],
		[2, 1],
		[3, 1],
	], // 12: missing SE+SW corners
	[
		[2, 0],
		[1, 4],
		[2, 1],
		[3, 1],
	], // 13: missing NW+SE+SW corners
	[
		[2, 4],
		[3, 0],
		[2, 1],
		[3, 1],
	], // 14: missing NE+SE+SW corners
	[
		[2, 0],
		[3, 0],
		[2, 1],
		[3, 1],
	], // 15: all cardinals, no diagonals
	[
		[0, 4],
		[1, 4],
		[0, 3],
		[1, 3],
	], // 16: missing W edge
	[
		[0, 4],
		[3, 0],
		[0, 3],
		[1, 3],
	], // 17: missing W+NE
	[
		[0, 4],
		[1, 4],
		[0, 3],
		[3, 1],
	], // 18: missing W+SE
	[
		[0, 4],
		[3, 0],
		[0, 3],
		[3, 1],
	], // 19: missing W (3 cardinals N+E+S)
	[
		[2, 2],
		[1, 2],
		[2, 3],
		[1, 3],
	], // 20: missing N edge
	[
		[2, 2],
		[1, 2],
		[2, 3],
		[3, 1],
	], // 21: missing N+SE
	[
		[2, 2],
		[1, 2],
		[2, 1],
		[1, 3],
	], // 22: missing N+SW
	[
		[2, 2],
		[1, 2],
		[2, 1],
		[3, 1],
	], // 23: missing N (3 cardinals E+S+W)
	[
		[2, 4],
		[3, 4],
		[2, 3],
		[3, 3],
	], // 24: missing E edge
	[
		[2, 4],
		[3, 4],
		[2, 1],
		[3, 3],
	], // 25: missing E+SW
	[
		[2, 0],
		[3, 4],
		[2, 3],
		[3, 3],
	], // 26: missing E+NW
	[
		[2, 0],
		[3, 4],
		[2, 1],
		[3, 3],
	], // 27: missing E (3 cardinals N+S+W)
	[
		[2, 4],
		[1, 4],
		[2, 5],
		[1, 5],
	], // 28: missing S edge
	[
		[2, 0],
		[1, 4],
		[2, 5],
		[1, 5],
	], // 29: missing S+NW
	[
		[2, 4],
		[3, 0],
		[2, 5],
		[1, 5],
	], // 30: missing S+NE
	[
		[2, 0],
		[3, 0],
		[2, 5],
		[1, 5],
	], // 31: missing S (3 cardinals N+E+W)
	[
		[0, 4],
		[3, 4],
		[0, 3],
		[3, 3],
	], // 32: N+S corridor (vertical)
	[
		[2, 2],
		[1, 2],
		[2, 5],
		[1, 5],
	], // 33: E+W corridor (horizontal)
	[
		[0, 2],
		[1, 2],
		[0, 3],
		[1, 3],
	], // 34: E+S (NW outer corner piece)
	[
		[0, 2],
		[1, 2],
		[0, 3],
		[3, 1],
	], // 35: E+S without SE
	[
		[2, 2],
		[3, 2],
		[2, 3],
		[3, 3],
	], // 36: S+W (NE outer corner piece)
	[
		[2, 2],
		[3, 2],
		[2, 1],
		[3, 3],
	], // 37: S+W without SW
	[
		[2, 4],
		[3, 4],
		[2, 5],
		[3, 5],
	], // 38: N+W (SE outer corner piece)
	[
		[2, 0],
		[3, 4],
		[2, 5],
		[3, 5],
	], // 39: N+W without NW
	[
		[0, 4],
		[1, 4],
		[0, 5],
		[1, 5],
	], // 40: N+E (SW outer corner piece)
	[
		[0, 4],
		[3, 0],
		[0, 5],
		[1, 5],
	], // 41: N+E without NE
	[
		[0, 2],
		[3, 2],
		[0, 3],
		[3, 3],
	], // 42: S only
	[
		[0, 2],
		[1, 2],
		[0, 5],
		[1, 5],
	], // 43: E only
	[
		[0, 4],
		[3, 4],
		[0, 5],
		[3, 5],
	], // 44: N only
	[
		[2, 2],
		[3, 2],
		[2, 5],
		[3, 5],
	], // 45: W only
	[
		[0, 2],
		[3, 2],
		[0, 5],
		[3, 5],
	], // 46: isolated (outer corners)
	[
		[0, 0],
		[1, 0],
		[0, 1],
		[1, 1],
	], // 47: isolated (cross/preview sub-tiles)
];

// =============================================================================
// Sub-Tile Copy
// =============================================================================

/**
 * Mutable pixel buffer used internally during expansion. The output array
 * needs to be written to, so we use a mutable variant of {@link PixelBuffer}.
 */
type MutablePixelBuffer = {
	readonly width: Num;
	readonly height: Num;
	readonly data: Uint8ClampedArray;
};

/**
 * Copies a quarter-tile region from the source sub-tile grid to the destination.
 *
 * @param source - Source pixel buffer (the 2×3 autotile block)
 * @param coords - Sub-tile coordinates [col, row] in the 4×6 grid
 * @param dest - Destination pixel buffer (the expanded output)
 * @param destX - Destination X pixel offset
 * @param destY - Destination Y pixel offset
 * @param halfTile - Half-tile size in pixels (16 for 32px tiles)
 */
function copySubTile(
	source: PixelBuffer,
	coords: readonly [Num, Num],
	dest: MutablePixelBuffer,
	destX: Num,
	destY: Num,
	halfTile: Num,
): void {
	const [col, row] = coords;
	const srcX: Num = col * halfTile;
	const srcY: Num = row * halfTile;

	for (let y = 0; y < halfTile; y++) {
		const srcRowStart: Num = ((srcY + y) * source.width + srcX) * 4;
		const dstRowStart: Num = ((destY + y) * dest.width + destX) * 4;

		for (let x = 0; x < halfTile; x++) {
			const srcIdx: Num = srcRowStart + x * 4;
			const dstIdx: Num = dstRowStart + x * 4;
			dest.data[dstIdx] = source.data[srcIdx] ?? 0; // R
			dest.data[dstIdx + 1] = source.data[srcIdx + 1] ?? 0; // G
			dest.data[dstIdx + 2] = source.data[srcIdx + 2] ?? 0; // B
			dest.data[dstIdx + 3] = source.data[srcIdx + 3] ?? 0; // A
		}
	}
}

// =============================================================================
// Expand Autotile Source
// =============================================================================

/** Number of autotile shapes in the FLOOR_AUTOTILE_TABLE. */
const SHAPE_COUNT: Num = 48;

/** Number of columns in the expanded output grid. */
const OUT_COLS: Num = 8;

/** Number of rows in the expanded output grid. */
const OUT_ROWS: Num = 6;

/**
 * Creates a new empty {@link PixelBuffer} with the given dimensions.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns A mutable pixel buffer with zeroed RGBA data
 */
function createPixelBuffer(width: Num, height: Num): MutablePixelBuffer {
	return {
		width,
		height,
		data: new Uint8ClampedArray(width * height * 4),
	};
}

/**
 * Expands a compact RPG Maker A2 autotile source (2×3 tiles) into 48 full
 * tiles using sub-tile composition from {@link FLOOR_AUTOTILE_TABLE}.
 *
 * The source pixel buffer must be exactly 2 tiles wide × 3 tiles tall. Each
 * tile is divided into 4 quarter-tiles forming a 4×6 sub-tile grid. The output
 * is an 8×6 grid of full tiles (48 tiles total) arranged in shape index order.
 *
 * @param sourceData - Pixel buffer from the 2×3 source image
 * @param tileSize - Tile size in pixels (32 for VX Ace, 48 for MV/MZ)
 * @returns BabylonResult containing pixel buffer for the expanded 8×6 tile grid
 *
 * @example
 * ```typescript
 * const source: PixelBuffer = {
 *   width: 64, height: 96,
 *   data: new Uint8ClampedArray(64 * 96 * 4),
 * };
 * const result = expandAutotileSource(source, 32);
 * if (result.ok) {
 *   // result.data.width === 256, result.data.height === 192
 * }
 * ```
 */
export function expandAutotileSource(
	sourceData: PixelBuffer,
	tileSize: Num,
): BabylonResult<PixelBuffer> {
	const halfTile: Num = tileSize / 2;
	const expectedWidth: Num = tileSize * 2;
	const expectedHeight: Num = tileSize * 3;

	if (sourceData.width !== expectedWidth || sourceData.height !== expectedHeight) {
		return err(
			ERRORS.ASSET.IMPORT_FAILED,
			`Autotile source must be ${String(expectedWidth)}×${String(expectedHeight)}px ` +
				`(2×3 tiles at ${String(tileSize)}px), got ${String(sourceData.width)}×${String(sourceData.height)}px`,
		);
	}

	const outWidth: Num = OUT_COLS * tileSize;
	const outHeight: Num = OUT_ROWS * tileSize;
	const output: MutablePixelBuffer = createPixelBuffer(outWidth, outHeight);

	for (let frame = 0; frame < SHAPE_COUNT; frame++) {
		const subtiles: ReadonlyArray<readonly [Num, Num]> | undefined = FLOOR_AUTOTILE_TABLE[frame];
		if (!subtiles) continue;

		const outCol: Num = frame % OUT_COLS;
		const outRow: Num = Math.floor(frame / OUT_COLS);
		const outX: Num = outCol * tileSize;
		const outY: Num = outRow * tileSize;

		const [tl, tr, bl, br] = subtiles;

		// Top-Left quadrant
		if (tl) copySubTile(sourceData, tl, output, outX, outY, halfTile);
		// Top-Right quadrant
		if (tr) copySubTile(sourceData, tr, output, outX + halfTile, outY, halfTile);
		// Bottom-Left quadrant
		if (bl) copySubTile(sourceData, bl, output, outX, outY + halfTile, halfTile);
		// Bottom-Right quadrant
		if (br) {
			copySubTile(sourceData, br, output, outX + halfTile, outY + halfTile, halfTile);
		}
	}

	return okShallow(output);
}

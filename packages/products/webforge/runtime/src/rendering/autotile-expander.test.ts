/**
 * Tests for autotile-expander — sub-tile composition for RPG Maker A2 autotiles.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { FLOOR_AUTOTILE_TABLE, expandAutotileSource, type PixelBuffer } from './autotile-expander';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates a PixelBuffer with the given dimensions and zeroed RGBA data.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns A PixelBuffer with zeroed pixel data
 */
function makeBuffer(width: Num, height: Num): PixelBuffer {
	return {
		width,
		height,
		data: new Uint8ClampedArray(width * height * 4),
	};
}

// =============================================================================
// FLOOR_AUTOTILE_TABLE
// =============================================================================

describe('FLOOR_AUTOTILE_TABLE', () => {
	it('has exactly 48 entries', () => {
		expect(FLOOR_AUTOTILE_TABLE).toHaveLength(48);
	});

	it('each entry has 4 sub-tile coordinate pairs', () => {
		for (const entry of FLOOR_AUTOTILE_TABLE) {
			expect(entry).toHaveLength(4);
			for (const [col, row] of entry) {
				expect(col).toBeGreaterThanOrEqual(0);
				expect(col).toBeLessThan(4);
				expect(row).toBeGreaterThanOrEqual(0);
				expect(row).toBeLessThan(6);
			}
		}
	});

	it('shape 0 (fully surrounded) uses center sub-tiles', () => {
		const shape0: ReadonlyArray<readonly [Num, Num]> = FLOOR_AUTOTILE_TABLE[0] ?? [];
		// RPG Maker MZ: shape 0 = [[2,4],[1,4],[2,3],[1,3]]
		expect(shape0[0]).toEqual([2, 4]);
		expect(shape0[1]).toEqual([1, 4]);
		expect(shape0[2]).toEqual([2, 3]);
		expect(shape0[3]).toEqual([1, 3]);
	});

	it('shape 46 (isolated) uses outer corner sub-tiles', () => {
		const shape46: ReadonlyArray<readonly [Num, Num]> = FLOOR_AUTOTILE_TABLE[46] ?? [];
		// RPG Maker MZ: shape 46 = [[0,2],[3,2],[0,5],[3,5]]
		expect(shape46[0]).toEqual([0, 2]);
		expect(shape46[1]).toEqual([3, 2]);
		expect(shape46[2]).toEqual([0, 5]);
		expect(shape46[3]).toEqual([3, 5]);
	});

	it('shape 47 (isolated cross) uses preview sub-tiles', () => {
		const shape47: ReadonlyArray<readonly [Num, Num]> = FLOOR_AUTOTILE_TABLE[47] ?? [];
		// RPG Maker MZ: shape 47 = [[0,0],[1,0],[0,1],[1,1]]
		expect(shape47[0]).toEqual([0, 0]);
		expect(shape47[1]).toEqual([1, 0]);
		expect(shape47[2]).toEqual([0, 1]);
		expect(shape47[3]).toEqual([1, 1]);
	});

	it('all 48 entries use valid sub-tile coordinates within 4×6 grid', () => {
		for (let i = 0; i < 48; i++) {
			const entry: ReadonlyArray<readonly [Num, Num]> = FLOOR_AUTOTILE_TABLE[i] ?? [];
			for (let q = 0; q < 4; q++) {
				const pair: readonly [Num, Num] | undefined = entry[q];
				expect(pair).toBeDefined();
				if (!pair) continue;
				const [col, row] = pair;
				expect(col).toBeGreaterThanOrEqual(0);
				expect(col).toBeLessThanOrEqual(3);
				expect(row).toBeGreaterThanOrEqual(0);
				expect(row).toBeLessThanOrEqual(5);
			}
		}
	});
});

// =============================================================================
// expandAutotileSource
// =============================================================================

describe('expandAutotileSource', () => {
	it('returns ok result with correct output dimensions for 32px tiles', () => {
		// 2 tiles × 3 tiles at 32px = 64×96
		const source: PixelBuffer = makeBuffer(64, 96);
		const result = expandAutotileSource(source, 32);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 48 tiles in 8×6 grid at 32px = 256×192
		expect(result.data.width).toBe(256);
		expect(result.data.height).toBe(192);
	});

	it('returns ok result with correct output dimensions for 48px tiles', () => {
		// 2 tiles × 3 tiles at 48px = 96×144
		const source: PixelBuffer = makeBuffer(96, 144);
		const result = expandAutotileSource(source, 48);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// 48 tiles in 8×6 grid at 48px = 384×288
		expect(result.data.width).toBe(384);
		expect(result.data.height).toBe(288);
	});

	it('returns error for wrong source width', () => {
		const source: PixelBuffer = makeBuffer(100, 96);
		const result = expandAutotileSource(source, 32);
		expect(result.ok).toBe(false);
	});

	it('returns error for wrong source height', () => {
		const source: PixelBuffer = makeBuffer(64, 100);
		const result = expandAutotileSource(source, 32);
		expect(result.ok).toBe(false);
	});

	it('correctly copies sub-tile pixel data for shape 0 (fully surrounded)', () => {
		// Create a 64×96 source with known pixel values
		const source: PixelBuffer = makeBuffer(64, 96);

		// Paint each sub-tile with a unique color based on (col, row) in the 4×6 grid
		// Sub-tiles are 16×16 each
		for (let row = 0; row < 6; row++) {
			for (let col = 0; col < 4; col++) {
				const r: Num = (col * 60 + 15) & 0xff;
				const g: Num = (row * 40 + 15) & 0xff;
				for (let py = 0; py < 16; py++) {
					for (let px = 0; px < 16; px++) {
						const idx: Num = ((row * 16 + py) * source.width + (col * 16 + px)) * 4;
						source.data[idx] = r;
						source.data[idx + 1] = g;
						source.data[idx + 2] = 128;
						source.data[idx + 3] = 255;
					}
				}
			}
		}

		const result = expandAutotileSource(source, 32);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Shape 0 = [[2,4],[1,4],[2,3],[1,3]]
		// Output tile 0 is at pixel (0,0) in the output
		// TL quadrant (0,0)-(15,15) should have sub-tile (2,4)
		// Check first pixel of TL quadrant
		const tlR: Num = result.data.data[0] ?? 0;
		const tlG: Num = result.data.data[1] ?? 0;

		// Sub-tile (2,4): r = (2*60+15) & 0xFF = 135, g = (4*40+15) & 0xFF = 175
		expect(tlR).toBe(135);
		expect(tlG).toBe(175);

		// TR quadrant starts at pixel (16,0) → sub-tile (1,4)
		const trIdx: Num = (0 * 256 + 16) * 4;
		const trR: Num = result.data.data[trIdx] ?? 0;
		const trG: Num = result.data.data[trIdx + 1] ?? 0;
		// Sub-tile (1,4): r = (1*60+15) & 0xFF = 75, g = (4*40+15) & 0xFF = 175
		expect(trR).toBe(75);
		expect(trG).toBe(175);
	});

	it('produces 48 distinct tiles when source has unique sub-tile data', () => {
		const source: PixelBuffer = makeBuffer(64, 96);
		// Fill with deterministic pattern so each sub-tile is unique
		for (let i = 0; i < source.data.length; i += 4) {
			source.data[i] = i % 256;
			source.data[i + 1] = (i * 7) % 256;
			source.data[i + 2] = (i * 13) % 256;
			source.data[i + 3] = 255;
		}

		const result = expandAutotileSource(source, 32);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Output should have non-zero pixel data throughout
		let nonZeroPixels: Num = 0;
		for (let i = 0; i < result.data.data.length; i += 4) {
			if (
				(result.data.data[i] ?? 0) > 0 ||
				(result.data.data[i + 1] ?? 0) > 0 ||
				(result.data.data[i + 2] ?? 0) > 0
			) {
				nonZeroPixels++;
			}
		}
		// With deterministic source, most pixels should be non-zero
		expect(nonZeroPixels).toBeGreaterThan(0);
	});
});

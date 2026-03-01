#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script, console output is expected */
/**
 * Splits an RPG Maker A2 terrain atlas into individual 2×3 autotile source PNGs.
 *
 * The input atlas is expected to be in LPC/RPG Maker A2 format:
 * - Width = 8 terrain types × 2 tiles = 16 tile columns
 * - Height = N rows × 3 tiles per terrain block
 * - Each terrain type occupies a 2-tile × 3-tile block (64×96px at 32px tiles)
 *
 * Usage:
 *   npx tsx split-a2-atlas.ts <input.png> <output-dir> [tile-size]
 *
 * Arguments:
 *   input.png   - Path to the A2 terrain atlas PNG
 *   output-dir  - Directory to write individual terrain PNGs
 *   tile-size   - Tile size in pixels (default: 32)
 *
 * Output:
 *   terrain-00.png, terrain-01.png, ... (zero-padded index)
 *   Each file is 2×3 tiles (e.g., 64×96px at 32px tile size)
 *
 * @example
 * ```bash
 * npx tsx split-a2-atlas.ts \
 *   assets/tilesets/lpc-terrain/terrain_summer.png \
 *   assets/tilesets/lpc-terrain/autotile/ \
 *   32
 * ```
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { PNG } from 'pngjs';

// =============================================================================
// Constants
// =============================================================================

/** Number of terrain types per row in an A2 atlas (8 terrain blocks). */
const TERRAINS_PER_ROW = 8;

/** Tile columns per terrain block. */
const BLOCK_COLS = 2;

/** Tile rows per terrain block. */
const BLOCK_ROWS = 3;

// =============================================================================
// Main
// =============================================================================

/**
 * Extracts a rectangular region from a source PNG into a new PNG.
 *
 * @param source - Source PNG image
 * @param sx - Source X offset in pixels
 * @param sy - Source Y offset in pixels
 * @param w - Region width in pixels
 * @param h - Region height in pixels
 * @returns New PNG containing the extracted region
 */
function extractRegion(source: PNG, sx: number, sy: number, w: number, h: number): PNG {
	const dest = new PNG({ width: w, height: h });

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const srcIdx = ((sy + y) * source.width + (sx + x)) * 4;
			const dstIdx = (y * w + x) * 4;
			dest.data[dstIdx] = source.data[srcIdx] ?? 0;
			dest.data[dstIdx + 1] = source.data[srcIdx + 1] ?? 0;
			dest.data[dstIdx + 2] = source.data[srcIdx + 2] ?? 0;
			dest.data[dstIdx + 3] = source.data[srcIdx + 3] ?? 0;
		}
	}

	return dest;
}

/**
 * Checks if a terrain block is entirely transparent (empty).
 *
 * @param png - PNG image to check
 * @returns True if all pixels have alpha = 0
 */
function isBlank(png: PNG): boolean {
	for (let i = 3; i < png.data.length; i += 4) {
		if ((png.data[i] ?? 0) > 0) return false;
	}
	return true;
}

function main(): void {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.error('Usage: npx tsx split-a2-atlas.ts <input.png> <output-dir> [tile-size]');
		console.error('');
		console.error('Arguments:');
		console.error('  input.png   - Path to the A2 terrain atlas PNG');
		console.error('  output-dir  - Directory to write individual terrain PNGs');
		console.error('  tile-size   - Tile size in pixels (default: 32)');
		process.exit(1);
	}

	const inputPath = args[0] ?? '';
	const outputDir = args[1] ?? '';
	const tileSize = Number(args[2] ?? '32');

	if (tileSize <= 0 || !Number.isInteger(tileSize)) {
		console.error(`Invalid tile size: ${String(tileSize)}`);
		process.exit(1);
	}

	// Read input PNG
	if (!fs.existsSync(inputPath)) {
		console.error(`Input file not found: ${inputPath}`);
		process.exit(1);
	}

	const inputBuffer = fs.readFileSync(inputPath);
	const source = PNG.sync.read(inputBuffer);

	console.log(`Input: ${inputPath}`);
	console.log(`  Dimensions: ${String(source.width)}×${String(source.height)}px`);
	console.log(`  Tile size: ${String(tileSize)}px`);

	// Calculate grid
	const blockWidth = BLOCK_COLS * tileSize;
	const blockHeight = BLOCK_ROWS * tileSize;
	const terrainsPerRow = Math.floor(source.width / blockWidth);
	const blockRows = Math.floor(source.height / blockHeight);
	const totalBlocks = terrainsPerRow * blockRows;

	if (terrainsPerRow !== TERRAINS_PER_ROW) {
		console.warn(
			`Warning: Expected ${String(TERRAINS_PER_ROW)} terrains per row, ` +
				`found ${String(terrainsPerRow)} (width=${String(source.width)}, blockWidth=${String(blockWidth)})`,
		);
	}

	console.log(
		`  Grid: ${String(terrainsPerRow)} terrains/row × ${String(blockRows)} rows = ${String(totalBlocks)} blocks`,
	);
	console.log(`  Block size: ${String(blockWidth)}×${String(blockHeight)}px`);

	const leftoverHeight = source.height - blockRows * blockHeight;
	if (leftoverHeight > 0) {
		console.log(`  Leftover height: ${String(leftoverHeight)}px (ignored)`);
	}

	// Create output directory
	fs.mkdirSync(outputDir, { recursive: true });

	// Extract each terrain block
	let extracted = 0;
	let skipped = 0;

	for (let row = 0; row < blockRows; row++) {
		for (let col = 0; col < terrainsPerRow; col++) {
			const index = row * terrainsPerRow + col;
			const sx = col * blockWidth;
			const sy = row * blockHeight;

			const block = extractRegion(source, sx, sy, blockWidth, blockHeight);

			// Skip blank (fully transparent) blocks
			if (isBlank(block)) {
				skipped++;
				continue;
			}

			const paddedIndex = String(index).padStart(2, '0');
			const outputPath = path.join(outputDir, `terrain-${paddedIndex}.png`);
			const outputBuffer = PNG.sync.write(block);
			fs.writeFileSync(outputPath, outputBuffer);

			extracted++;
			console.log(`  [${paddedIndex}] row=${String(row)} col=${String(col)} → ${outputPath}`);
		}
	}

	console.log('');
	console.log(
		`Done: ${String(extracted)} terrain blocks extracted, ${String(skipped)} blank blocks skipped.`,
	);
	console.log(`Output: ${outputDir}`);
}

main();

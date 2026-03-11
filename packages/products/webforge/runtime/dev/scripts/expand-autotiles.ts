#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script, console output is expected */
/**
 * Expands compact RPG Maker A2 autotile source PNGs (2×3 tiles, 64×96px)
 * into full 48-tile expanded PNGs (8×6 tiles, 256×192px).
 *
 * Uses the expandAutotileSource function from autotile-expander.ts to
 * compose 48 unique patterns from the 24 sub-tiles in each source image.
 *
 * Usage:
 *   npx tsx expand-autotiles.ts <input-dir> [output-dir] [tile-size]
 *
 * Arguments:
 *   input-dir   - Directory containing terrain-*.png source files (64×96)
 *   output-dir  - Directory to write expanded PNGs (default: input-dir)
 *   tile-size   - Tile size in pixels (default: 32)
 *
 * Output:
 *   terrain-00.png, terrain-01.png, ... (overwrites in output-dir)
 *   Each file is 8×6 tiles (e.g., 256×192px at 32px tile size)
 *
 * @example
 * ```bash
 * npx tsx expand-autotiles.ts \
 *   assets/tilesets/lpc-terrain/autotile/ \
 *   assets/tilesets/lpc-terrain/autotile-expanded/ \
 *   32
 * ```
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { PNG } from 'pngjs';

import { expandAutotileSource, type PixelBuffer } from '../../src/rendering/autotile-expander';

// =============================================================================
// Main
// =============================================================================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx expand-autotiles.ts <input-dir> [output-dir] [tile-size]');
    console.error('');
    console.error('Arguments:');
    console.error('  input-dir   - Directory containing terrain-*.png source files');
    console.error('  output-dir  - Directory to write expanded PNGs (default: input-dir)');
    console.error('  tile-size   - Tile size in pixels (default: 32)');
    process.exit(1);
  }

  const inputDir = args[0] ?? '';
  const outputDir = args[1] ?? inputDir;
  const tileSize = Number(args[2] ?? '32');

  if (tileSize <= 0 || !Number.isInteger(tileSize)) {
    console.error(`Invalid tile size: ${String(tileSize)}`);
    process.exit(1);
  }

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  // Find all terrain-*.png files
  const files = fs
    .readdirSync(inputDir)
    .filter((f: string) => f.startsWith('terrain-') && f.endsWith('.png'))
    .toSorted();

  if (files.length === 0) {
    console.error(`No terrain-*.png files found in: ${inputDir}`);
    process.exit(1);
  }

  console.log(`Input: ${inputDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Tile size: ${String(tileSize)}px`);
  console.log(`Found ${String(files.length)} terrain files`);
  console.log('');

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  let expanded = 0;
  let errors = 0;

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    // Read source PNG
    const inputBuffer = fs.readFileSync(inputPath);
    const png = PNG.sync.read(inputBuffer);

    // Convert PNG buffer to PixelBuffer (Uint8ClampedArray)
    const pixelData = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length);
    const sourceData: PixelBuffer = {
      width: png.width,
      height: png.height,
      data: pixelData,
    };

    // Expand 2×3 → 8×6
    const result = expandAutotileSource(sourceData, tileSize);
    if (!result.ok) {
      console.error(`  ✗ ${file}: ${result.error.message ?? 'expansion failed'}`);
      errors++;
      continue;
    }

    // Convert PixelBuffer back to PNG
    const outPng = new PNG({
      width: result.data.width,
      height: result.data.height,
    });
    for (let i = 0; i < result.data.data.length; i++) {
      outPng.data[i] = result.data.data[i] ?? 0;
    }

    // Write output
    const outputBuffer = PNG.sync.write(outPng);
    fs.writeFileSync(outputPath, outputBuffer);

    console.log(
      `  ✓ ${file}: ${String(png.width)}×${String(png.height)} → ${String(result.data.width)}×${String(result.data.height)}`,
    );
    expanded++;
  }

  console.log('');
  console.log(`Done: ${String(expanded)} files expanded, ${String(errors)} errors.`);
}

main();

# Test Map Rework — Implementation Plan (v2: Autotile Support)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Overview

Make autotiles work end-to-end so ANY RPG Maker tileset renders correctly. Then rewrite the test map to use proper autotile terrain. Key deliverables:

1. Fix the BITMASK_TO_FRAME lookup table (existing is wrong — only 40 frames, needs 47)
2. New autotile-expander module (2×3 source → 48 full tiles)
3. A2 atlas splitter script (offline tool to extract terrain types from LPC atlas)
4. Update tileset-loader for runtime autotile expansion
5. Rewrite test-map.ts with autotile terrain
6. Wire 3D props + dev harness controls in dev.ts

## QA Commands (run after EVERY file edit)

```bash
pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format:check
```

---

## Task 1: Fix BITMASK_TO_FRAME Table

**File:** `packages/products/webforge/runtime/src/rendering/autotile-resolver.ts`

### 1a. Replace BITMASK_TO_FRAME with corrected table

The current table maps to frame indices 0–39 (40 unique values). The correct RPG Maker MZ mapping uses indices 0–46 (47 unique shapes). Shape 47 shares bitmask 0 with shape 46 — only 46 is reachable via bitmask lookup.

Replace the existing `BITMASK_TO_FRAME` array with:

```typescript
// prettier-ignore
const BITMASK_TO_FRAME: readonly Num[] = [
	46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40,
	42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16,
	46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40,
	42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16,
	45, 39, 45, 39, 33, 31, 33, 29, 45, 39, 45, 39, 33, 31, 33, 29,
	37, 27, 37, 27, 23, 15, 23, 13, 37, 27, 37, 27, 22, 11, 22,  9,
	45, 39, 45, 39, 33, 31, 33, 29, 45, 39, 45, 39, 33, 31, 33, 29,
	36, 26, 36, 26, 21,  7, 21,  5, 36, 26, 36, 26, 20,  3, 20,  1,
	46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40,
	42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16,
	46, 44, 46, 44, 43, 41, 43, 40, 46, 44, 46, 44, 43, 41, 43, 40,
	42, 32, 42, 32, 35, 19, 35, 18, 42, 32, 42, 32, 34, 17, 34, 16,
	45, 38, 45, 38, 33, 30, 33, 28, 45, 38, 45, 38, 33, 30, 33, 28,
	37, 25, 37, 25, 23, 14, 23, 12, 37, 25, 37, 25, 22, 10, 22,  8,
	45, 38, 45, 38, 33, 30, 33, 28, 45, 38, 45, 38, 33, 30, 33, 28,
	36, 24, 36, 24, 21,  6, 21,  4, 36, 24, 36, 24, 20,  2, 20,  0,
];
```

Shape ordering (RPG Maker MZ standard):
- 0 = fully surrounded (all 8 neighbors)
- 1–15 = all 4 cardinals present, varying corner combinations
- 16–31 = missing one cardinal edge (4 groups of 4)
- 32–33 = corridors (N+S, E+W)
- 34–41 = two adjacent cardinals (outer corners)
- 42–45 = single cardinal (peninsulas)
- 46 = isolated (no neighbors)

### 1b. Update JSDoc comments

Update the BITMASK_TO_FRAME comment to document the correct shape ordering and source (RPG Maker MZ Tilemap.js).

### 1c. Update existing tests

The existing `autotile-resolver.test.ts` tests will need their expected frame index values updated to match the new table. Key test cases to verify:

- Bitmask 0 (no neighbors) → frame 46 (isolated)
- Bitmask 255 (all neighbors) → frame 0 (fully surrounded)
- Bitmask with just N+E+S+W (0b01010101 = 0x55) → frame 15 (all cardinals, no diagonals)

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 2: Create Autotile Expander Module

**File:** `packages/products/webforge/runtime/src/rendering/autotile-expander.ts`
**Test:** `packages/products/webforge/runtime/src/rendering/autotile-expander.test.ts`

### 2a. Write tests first

```typescript
import { describe, it, expect } from 'vitest';
import { expandAutotileSource, FLOOR_AUTOTILE_TABLE } from './autotile-expander';

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

  it('frame 0 (fully surrounded) uses all center sub-tiles', () => {
    // Shape 0 = all center fill: [2,4],[1,4],[2,3],[1,3]
    // Wait — RPG Maker uses inverted row coords. Verify against actual table.
    const shape0 = FLOOR_AUTOTILE_TABLE[0];
    expect(shape0).toBeDefined();
  });

  it('frame 46 (isolated) uses all outer corner sub-tiles', () => {
    const shape46 = FLOOR_AUTOTILE_TABLE[46];
    expect(shape46).toBeDefined();
  });
});

describe('expandAutotileSource', () => {
  it('returns ok result with ImageData of correct dimensions', () => {
    // Create a 64×96 source (2 tiles × 3 tiles at 32px)
    const sourceData = new ImageData(64, 96);
    const result = expandAutotileSource(sourceData, 32);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 48 tiles in 8×6 grid at 32px = 256×192
      expect(result.data.width).toBe(256);
      expect(result.data.height).toBe(192);
    }
  });

  it('returns error for wrong source dimensions', () => {
    const sourceData = new ImageData(100, 100); // wrong size
    const result = expandAutotileSource(sourceData, 32);
    expect(result.ok).toBe(false);
  });
});
```

### 2b. Implement FLOOR_AUTOTILE_TABLE

Export the complete 48-entry table as a typed constant:

```typescript
/**
 * RPG Maker MZ FLOOR_AUTOTILE_TABLE — maps shape index (0–47) to
 * four sub-tile coordinates [col, row] in the 4×6 quarter-tile grid.
 *
 * Each entry: [[TL_col, TL_row], [TR_col, TR_row], [BL_col, BL_row], [BR_col, BR_row]]
 *
 * Source: RPG Maker MZ Tilemap.js (rpgmakerofficial.com)
 */
export const FLOOR_AUTOTILE_TABLE: ReadonlyArray<ReadonlyArray<readonly [Num, Num]>> = [
  [[2,4],[1,4],[2,3],[1,3]],  // 0: fully surrounded
  [[2,0],[1,4],[2,3],[1,3]],  // 1: missing NW corner
  [[2,4],[3,0],[2,3],[1,3]],  // 2: missing NE corner
  // ... all 48 entries from RPG Maker MZ source (see design doc research)
  [[0,0],[1,0],[0,1],[1,1]],  // 47: isolated (cross/plus sub-tiles)
];
```

### 2c. Implement expandAutotileSource

```typescript
/**
 * Expands a compact RPG Maker A2 autotile source (2×3 tiles) into
 * 48 full tiles using sub-tile composition.
 *
 * @param sourceData - ImageData from the 2×3 source image
 * @param tileSize - Tile size in pixels (32 for VX Ace, 48 for MV/MZ)
 * @returns Result containing ImageData for the expanded 8×6 tile grid
 */
export function expandAutotileSource(
  sourceData: ImageData,
  tileSize: Num,
): Result<ImageData> {
  const halfTile: Num = tileSize / 2;
  const expectedWidth: Num = tileSize * 2;  // 64px for 32px tiles
  const expectedHeight: Num = tileSize * 3; // 96px for 32px tiles

  // Validate source dimensions
  if (sourceData.width !== expectedWidth || sourceData.height !== expectedHeight) {
    return err(ERRORS.ASSET.IMPORT_FAILED, 'Source must be 2×3 tiles');
  }

  // Output: 8 cols × 6 rows of full tiles
  const outCols: Num = 8;
  const outRows: Num = 6;
  const outWidth: Num = outCols * tileSize;
  const outHeight: Num = outRows * tileSize;
  const output = new ImageData(outWidth, outHeight);

  for (let frame = 0; frame < 48; frame++) {
    const subtiles = FLOOR_AUTOTILE_TABLE[frame]!;
    const outCol: Num = frame % outCols;
    const outRow: Num = Math.floor(frame / outCols);
    const outX: Num = outCol * tileSize;
    const outY: Num = outRow * tileSize;

    // TL quadrant
    copySubTile(sourceData, subtiles[0]!, output, outX, outY, halfTile);
    // TR quadrant
    copySubTile(sourceData, subtiles[1]!, output, outX + halfTile, outY, halfTile);
    // BL quadrant
    copySubTile(sourceData, subtiles[2]!, output, outX, outY + halfTile, halfTile);
    // BR quadrant
    copySubTile(sourceData, subtiles[3]!, output, outX + halfTile, outY + halfTile, halfTile);
  }

  return okUnchecked(output);
}
```

Helper to copy a quarter-tile region:

```typescript
function copySubTile(
  source: ImageData,
  coords: readonly [Num, Num],
  dest: ImageData,
  destX: Num,
  destY: Num,
  halfTile: Num,
): void {
  const [col, row] = coords;
  const srcX: Num = col * halfTile;
  const srcY: Num = row * halfTile;

  for (let y = 0; y < halfTile; y++) {
    for (let x = 0; x < halfTile; x++) {
      const srcIdx: Num = ((srcY + y) * source.width + (srcX + x)) * 4;
      const dstIdx: Num = ((destY + y) * dest.width + (destX + x)) * 4;
      dest.data[dstIdx] = source.data[srcIdx]!;     // R
      dest.data[dstIdx + 1] = source.data[srcIdx + 1]!; // G
      dest.data[dstIdx + 2] = source.data[srcIdx + 2]!; // B
      dest.data[dstIdx + 3] = source.data[srcIdx + 3]!; // A
    }
  }
}
```

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 3: Create A2 Atlas Splitter Script

**File:** `packages/products/webforge/runtime/dev/scripts/split-a2-atlas.ts`

Offline Node.js script that reads the LPC terrain atlas and extracts individual 2×3 autotile blocks.

### 3a. Script implementation

```typescript
#!/usr/bin/env npx tsx
/**
 * Splits an RPG Maker A2 terrain atlas into individual 2×3 autotile source PNGs.
 *
 * Usage: npx tsx split-a2-atlas.ts <input.png> <output-dir> [tile-size]
 *
 * The input atlas should be 16 columns wide (8 terrain types × 2 tiles each).
 * Each terrain type occupies a 2-tile × 3-tile block.
 */
```

Uses `canvas` (or `sharp` or raw pixel manipulation) to:
1. Load the A2 atlas PNG
2. Calculate grid: 8 terrain types per row, rows = imageHeight / (tileSize * 3)
3. For each terrain block:
   - Extract 64×96 pixels (for 32px tiles)
   - Save as `terrain-NN.png` (zero-padded index)
4. Print summary: which blocks were extracted and their positions

### 3b. Run the script on LPC terrain_summer.png

```bash
npx tsx packages/products/webforge/runtime/dev/scripts/split-a2-atlas.ts \
  assets/tilesets/lpc-terrain/terrain_summer.png \
  assets/tilesets/lpc-terrain/autotile/ \
  32
```

This produces individual 64×96 PNGs in `assets/tilesets/lpc-terrain/autotile/`:
- `terrain-00.png` (grass)
- `terrain-01.png` (grass-dark)
- `terrain-02.png` (dirt)
- `terrain-03.png` (cobble)
- etc.

### 3c. Run on seasonal variants too

```bash
for season in spring autumn winter; do
  npx tsx split-a2-atlas.ts \
    assets/tilesets/lpc-terrain/terrain_${season}.png \
    assets/tilesets/lpc-terrain/autotile-${season}/ 32
done
```

**QA:** Script runs without errors, output PNGs exist and are correct size.

---

## Task 4: Update Tileset Loader for Autotile Expansion

**File:** `packages/products/webforge/runtime/src/rendering/tileset-loader.ts`
**Test:** `packages/products/webforge/runtime/src/rendering/tileset-loader.test.ts`

### 4a. Write tests first

Add test for autotile expansion path in loader:

```typescript
it('expands 2×3 autotile source to 48 tiles when terrain_48', async () => {
  // Create a 2×3 tileset config
  const config: TilesetConfig = {
    name: 'grass',
    imagePath: 'autotile/terrain-00.png',
    columns: 2,
    rows: 3,
    tileWidth: 32,
    tileHeight: 32,
    firstGid: 1,
    autotileType: 'terrain_48',
    animationFrames: 1,
    animationSpeed: 4,
    tileProperties: {},
  };

  const result = await loadTileset(config, scene);
  expect(result.ok).toBe(true);
  if (result.ok) {
    // Should have 48 UV entries (expanded from 6)
    expect(result.data.uvLookup).toHaveLength(48);
  }
});
```

### 4b. Modify loadTileset to detect and expand autotile sources

In `loadTileset()`, after loading the image and before computing UVs:

```typescript
// Detect autotile source: compact 2×3 image with terrain_48 type
if (config.autotileType === 'terrain_48' && config.columns === 2 && config.rows === 3) {
  // Load source image pixels
  const sourceImageData = getImageDataFromTexture(texture, config);

  // Expand 2×3 → 48 tiles (8 cols × 6 rows)
  const expandResult = expandAutotileSource(sourceImageData, config.tileWidth);
  if (!expandResult.ok) return expandResult;

  // Create new texture from expanded canvas
  const expandedTexture = createTextureFromImageData(expandResult.data, scene);

  // Override columns/rows for UV computation
  const expandedCols = 8;
  const expandedRows = 6;
  const uvResult = computeTileUVs({
    columns: expandedCols,
    rows: expandedRows,
    tileWidth: config.tileWidth,
    tileHeight: config.tileHeight,
  });
  if (!uvResult.ok) return uvResult;

  return okShallow({ config, texture: expandedTexture, uvLookup: uvResult.data });
}
```

### 4c. Add helper functions

- `getImageDataFromTexture()`: Reads pixel data from loaded Babylon.js texture into ImageData
- `createTextureFromImageData()`: Creates a Babylon.js texture from an ImageData using a canvas

These require browser canvas APIs. For the tileset loader (which runs in browser), this is available. For tests with NullEngine, we'll need to use `createCanvas` from a polyfill or skip the expansion path.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 5: Rewrite test-map.ts — Autotile Terrain

**File:** `packages/products/webforge/runtime/dev/test-map.ts`

### 5a. Replace tileset configuration

Remove the 10 LPC tilesets with `autotileType: 'none'`. Replace with:

**Autotile tilesets** (source: 2×3 blocks from the A2 splitter):

```typescript
const AUTOTILE_TILESETS = {
  grass:     { src: 'tilesets/lpc-terrain/autotile/terrain-00.png', gid: 1 },
  darkGrass: { src: 'tilesets/lpc-terrain/autotile/terrain-01.png', gid: 49 },
  dirt:      { src: 'tilesets/lpc-terrain/autotile/terrain-02.png', gid: 97 },
  cobble:    { src: 'tilesets/lpc-terrain/autotile/terrain-03.png', gid: 145 },
  water:     { src: 'tilesets/lpc-terrain/autotile/terrain-12.png', gid: 193 },
  sand:      { src: 'tilesets/lpc-terrain/autotile/terrain-07.png', gid: 241 },
};
```

Each autotile tileset config: `columns: 2, rows: 3, tileWidth: 32, tileHeight: 32, autotileType: 'terrain_48'`.

**Regular tilesets** (non-autotile, for decorations):

```typescript
const DECO_TILESETS = {
  trees:   { src: 'tilesets/lpc-terrain/trees_summer.png', gid: 289, cols: 16, rows: 18 },
  flowers: { src: 'tilesets/lpc-terrain/flowers.png',      gid: 577, cols: 11, rows: 5 },
  rocks:   { src: 'tilesets/lpc-terrain/Rocks, Grasslands.png', gid: 632, cols: 6, rows: 12 },
  cliffs:  { src: 'tilesets/lpc-terrain/cliff_summer.png', gid: 704, cols: 16, rows: 14 },
};
```

(GID ranges will be confirmed at implementation time based on actual tile counts.)

### 5b. Simplify ground layer generation

With autotiles, the ground layer becomes trivially simple — just fill each cell with the terrain type's `firstGid`:

```typescript
function generateGround(): Num[] {
  const data: Num[] = new Array(W * H).fill(AUTOTILE_TILESETS.grass.gid);

  // Forest zone: dark grass
  fillZone(data, ZONES.forest, AUTOTILE_TILESETS.darkGrass.gid);

  // River: water
  fillZone(data, ZONES.river, AUTOTILE_TILESETS.water.gid);

  // Lake: water
  for (let z = ZONES.lake.z1; z <= ZONES.lake.z2; z++) {
    for (let x = ZONES.lake.x1; x <= ZONES.lake.x2; x++) {
      if (isLake(x, z)) data[idx(x, z)] = AUTOTILE_TILESETS.water.gid;
    }
  }

  // Village paths: cobble
  drawPath(data, /* main E-W path */);
  drawPath(data, /* N-S path */);

  // Meadow: grass with dirt patches
  for (let z = ZONES.meadow.z1; z <= ZONES.meadow.z2; z++) {
    for (let x = ZONES.meadow.x1; x <= ZONES.meadow.x2; x++) {
      if (isTilledPatch(x, z)) data[idx(x, z)] = AUTOTILE_TILESETS.dirt.gid;
    }
  }

  // Ruins: cobble
  fillZone(data, ZONES.ruins, AUTOTILE_TILESETS.cobble.gid);

  return data;
}
```

The autotile resolver automatically generates the correct edges, corners, and transitions!

### 5c. Keep decoration, upper, shadow layers

Same approach as v1 design — trees, flowers, mushrooms, rocks placed on decoration/upper layers using regular (non-autotile) tilesets with specific tile IDs.

### 5d. Keep height map

Same 4-level height map as v1 design. No changes needed.

### 5e. Export TEST_MAP_DATA, SEASON_PATHS, ATMOSPHERE_PRESETS

Same as v1, with updated tileset configs and layer generators.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 6: Wire Dev Harness (dev.ts)

**File:** `packages/products/webforge/runtime/dev/dev.ts`

### 6a. Verify 3D prop system is wired into main()

The 3D prop system (`create3DProps`, `buildTestMapUI`) was partially wired in the prior session. Confirm it's called in `main()` and functioning.

### 6b. Ensure season switching works with autotile tilesets

Season dropdown needs to update the autotile tileset image paths to the seasonal variants (which also need to be split via the A2 splitter). On season change:

1. Destroy current tilemap
2. Update each autotile tileset's `imagePath` to the seasonal variant
3. Re-render tilemap (the loader will re-expand the new seasonal 2×3 sources)

### 6c. Verify all Test Map sidebar controls work

All controls from v1 design should work:
- Season dropdown (already implemented)
- 3D Props toggle
- Prop Shadows toggle
- Torch Lights toggle
- Torch Glow toggle
- Prop Opacity slider
- Atmosphere dropdown (already implemented)
- Randomize Deco button

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 7: Update Tests

### 7a. Update autotile-resolver.test.ts

Fix expected frame indices in all tests to match the corrected BITMASK_TO_FRAME table.

### 7b. Update chunk-builder.test.ts

If any chunk builder tests reference specific frame indices, update them.

### 7c. Run full test suite

```bash
pnpm qa:test
```

All 1741+ tests must pass.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 8: Update Documentation

### 8a. Update docs/ARCHITECTURE.md

Add section on autotile expansion pipeline:
- A2 atlas format
- Sub-tile composition algorithm
- How the tileset loader auto-expands 2×3 sources

### 8b. Update runtime README

Document the autotile system: supported formats, how to add new terrain types, FLOOR_AUTOTILE_TABLE reference.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 9: Visual Verification (expand-feature step 8)

### 9a. Navigate to dev harness, take baseline screenshot
### 9b. Register discovery + helper scripts
### 9c. Inventory Test Map section controls
### 9d. Test each control systematically:

- **Autotile terrain rendering:** Verify grass has proper edges, water has proper shores, cobble paths have proper borders
- **Season dropdown:** Summer → Spring → Autumn → Winter, screenshot each
- **3D Props:** ON/OFF, screenshot
- **Prop Shadows:** ON/OFF, screenshot
- **Torch Lights:** ON/OFF, screenshot
- **Prop Opacity:** 0.0 → 0.5 → 1.0, screenshot
- **Atmosphere presets:** each → screenshot
- **Camera angles:** Free Orbit, HD-2D, Isometric → screenshot

### 9e. Verify autotile correctness specifically:

- Grass-water border: should show smooth transition tiles (not raw solid fills)
- Cobble path in village: should have proper edge tiles where cobble meets grass
- River edges: water should have border tiles against grass on both sides
- Lake shore: organic lake shape with proper water edge tiles
- Isolated cobble: single cobble tile should show isolated pattern (outer corners)

### 9f. Document ✅ or ❌ for each control

---

## Task 10: Commit

```bash
git add packages/products/webforge/runtime/src/rendering/autotile-expander.ts
git add packages/products/webforge/runtime/src/rendering/autotile-expander.test.ts
git add packages/products/webforge/runtime/src/rendering/autotile-resolver.ts
git add packages/products/webforge/runtime/src/rendering/autotile-resolver.test.ts
git add packages/products/webforge/runtime/src/rendering/tileset-loader.ts
git add packages/products/webforge/runtime/src/rendering/tileset-loader.test.ts
git add packages/products/webforge/runtime/dev/test-map.ts
git add packages/products/webforge/runtime/dev/dev.ts
git add packages/products/webforge/runtime/dev/scripts/split-a2-atlas.ts
git add assets/tilesets/lpc-terrain/autotile/
git add docs/
git commit -m "feat(runtime): autotile expansion + professional test map

- Fix BITMASK_TO_FRAME table to match RPG Maker MZ standard (47 shapes)
- Add autotile-expander module (2×3 source → 48 full tiles)
- Add A2 atlas splitter script for offline tileset extraction
- Update tileset-loader to auto-expand compact autotile sources
- Rewrite test map with proper autotile terrain (grass, dirt, water, cobble)
- 7 terrain zones with 3D props, height map, season switching"
```

## Implementation Order

1. **Task 1** — Fix BITMASK_TO_FRAME table (autotile-resolver.ts)
2. **Task 2** — Create autotile-expander module (new file + tests)
3. **Task 3** — Create A2 atlas splitter script + run on LPC tilesets
4. **Task 4** — Update tileset-loader for runtime expansion
5. **Task 5** — Rewrite test-map.ts with autotile terrain
6. **Task 6** — Wire dev harness
7. **Task 7** — Update tests, run full suite
8. **Task 8** — Update documentation
9. **Task 9** — Visual verification
10. **Task 10** — Commit

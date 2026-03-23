/**
 * Multi-tileset mega-atlas packing.
 *
 * When a map references multiple tilesets, the GPU shader needs to
 * sample from a single texture atlas. This module calculates the
 * mega-atlas layout and remaps tile IDs so all tilesets pack into
 * one unified atlas grid.
 *
 * @example
 * ```typescript
 * import { calculateMegaAtlasLayout, remapTileIds } from './tile-mega-atlas';
 *
 * const layout = calculateMegaAtlasLayout({ tilesets: [...] });
 * if (layout.ok) {
 *   const remapped = remapTileIds({ tileIds, remapTable: layout.data.remapTable });
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Types
// =============================================================================

/** A tileset entry describing one atlas to be packed into the mega-atlas. */
export const TilesetEntrySchema = v.pipe(
  v.strictObject({
    /** Index of this tileset in the map's tileset array. */
    tilesetIndex: v.pipe(v.number(), v.integer(), v.minValue(0)),
    /** Number of tile columns in this tileset. */
    columns: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Number of tile rows in this tileset. */
    rows: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Tile width in pixels. */
    tileWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Tile height in pixels. */
    tileHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** First global tile ID for this tileset. */
    firstGid: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  v.readonly(),
);

/** A tileset entry. */
export type TilesetEntry = v.InferOutput<typeof TilesetEntrySchema>;

/** Placement info for one tileset within the mega-atlas. */
export const TilesetPlacementSchema = v.pipe(
  v.strictObject({
    /** Index of this tileset. */
    tilesetIndex: v.pipe(v.number(), v.integer(), v.minValue(0)),
    /** Offset in mega-atlas tile IDs (first tile of this tileset in mega-atlas). */
    megaAtlasOffset: v.pipe(v.number(), v.integer(), v.minValue(0)),
    /** Number of tiles in this tileset. */
    tileCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** First global ID in the original map data. */
    firstGid: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  v.readonly(),
);

/** Placement info for one tileset within the mega-atlas. */
export type TilesetPlacement = v.InferOutput<typeof TilesetPlacementSchema>;

/** Mega-atlas layout result. */
export const MegaAtlasLayoutSchema = v.strictObject({
  /** Total grid columns in the mega-atlas. */
  gridColumns: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** Total grid rows in the mega-atlas. */
  gridRows: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** Tile width in pixels. */
  tileWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** Tile height in pixels. */
  tileHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** Total tiles in the mega-atlas grid. */
  totalTiles: v.pipe(v.number(), v.integer(), v.minValue(1)),
  /** Global ID → mega-atlas local ID remap table. */
  remapTable: v.custom<Map<Num, Num>>((val): val is Map<Num, Num> => val instanceof Map),
  /** Per-tileset placement info. */
  placements: v.custom<readonly TilesetPlacement[]>((val): val is readonly TilesetPlacement[] =>
    Array.isArray(val),
  ),
});

/** Mega-atlas layout. */
export type MegaAtlasLayout = v.InferOutput<typeof MegaAtlasLayoutSchema>;

// =============================================================================
// Options Schemas
// =============================================================================

/** Options schema for {@link calculateMegaAtlasLayout}. */
export const CalculateMegaAtlasLayoutOptionsSchema = v.pipe(
  v.strictObject({
    /** Tileset entries to pack into the mega-atlas. */
    tilesets: v.custom<readonly TilesetEntry[]>((val): val is readonly TilesetEntry[] =>
      Array.isArray(val),
    ),
  }),
  v.readonly(),
);

/** Options for {@link calculateMegaAtlasLayout}. */
export type CalculateMegaAtlasLayoutOptions = v.InferOutput<
  typeof CalculateMegaAtlasLayoutOptionsSchema
>;

/** Options schema for {@link remapTileIds}. */
export const RemapTileIdsOptionsSchema = v.pipe(
  v.strictObject({
    /** Tile IDs to remap. */
    tileIds: v.custom<readonly Num[]>((val): val is readonly Num[] => Array.isArray(val)),
    /** Global ID → mega-atlas local ID remap table. */
    remapTable: v.custom<Map<Num, Num>>((val): val is Map<Num, Num> => val instanceof Map),
  }),
  v.readonly(),
);

/** Options for {@link remapTileIds}. */
export type RemapTileIdsOptions = v.InferOutput<typeof RemapTileIdsOptionsSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Rounds up to the next power of two.
 *
 * @param n - The number to round
 * @returns The next power of 2 >= n
 */
function nextPowerOfTwo(n: Num): Num {
  if (n <= 1) return 1;
  let p: Num = 1;
  while (p < n) p *= 2;
  return p;
}

// =============================================================================
// calculateMegaAtlasLayout
// =============================================================================

/**
 * Calculates the mega-atlas layout for packing multiple tilesets.
 *
 * Determines the optimal grid dimensions, builds the remap table
 * mapping global tile IDs to mega-atlas local IDs, and records
 * per-tileset placement info.
 *
 * @param options - Tileset entries to pack
 * @returns BabylonResult containing the mega-atlas layout
 *
 * @example
 * ```typescript
 * const result = calculateMegaAtlasLayout({
 *   tilesets: [
 *     { tilesetIndex: 0, columns: 8, rows: 6, tileWidth: 16, tileHeight: 16, firstGid: 1 },
 *     { tilesetIndex: 1, columns: 4, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 49 },
 *   ],
 * });
 * ```
 */
export function calculateMegaAtlasLayout(
  options: CalculateMegaAtlasLayoutOptions,
): BabylonResult<MegaAtlasLayout> {
  const { tilesets } = options;

  if (tilesets.length === 0) {
    return err(
      ERRORS.VALIDATION.SCHEMA_FAILED,
      'At least one tileset is required for mega-atlas layout',
    );
  }

  // Use the tile size from the first tileset (all must match for GPU shader)
  const tileWidth: Num = tilesets[0]?.tileWidth ?? 16;
  const tileHeight: Num = tilesets[0]?.tileHeight ?? 16;

  // Count total tiles across all tilesets
  let totalTiles: Num = 0;
  for (const ts of tilesets) {
    totalTiles += ts.columns * ts.rows;
  }

  // Calculate mega-atlas grid dimensions
  // We want a roughly square grid that fits all tiles,
  // with power-of-2 pixel dimensions
  const gridColsRaw: Num = Math.ceil(Math.sqrt(totalTiles));
  const gridColumns: Num = nextPowerOfTwo(gridColsRaw);
  const gridRowsRaw: Num = Math.ceil(totalTiles / gridColumns);
  const gridRows: Num = nextPowerOfTwo(gridRowsRaw);

  // For single tileset, use its original dimensions if they're already POT-compatible
  if (tilesets.length === 1) {
    const [ts]: readonly TilesetEntry[] = tilesets;
    if (!ts) {
      return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Tileset entry missing');
    }
    const pixelW: Num = ts.columns * ts.tileWidth;
    const pixelH: Num = ts.rows * ts.tileHeight;
    const isPotW: boolean = (pixelW & (pixelW - 1)) === 0;
    const isPotH: boolean = (pixelH & (pixelH - 1)) === 0;

    if (isPotW && isPotH) {
      // Original tileset is already power-of-2 sized
      const remapTable = new Map<Num, Num>();
      const tileCount: Num = ts.columns * ts.rows;
      for (let i: Num = 0; i < tileCount; i++) {
        remapTable.set(ts.firstGid + i, ts.firstGid + i);
      }

      const placement: TilesetPlacement = {
        tilesetIndex: ts.tilesetIndex,
        megaAtlasOffset: 0,
        tileCount,
        firstGid: ts.firstGid,
      };

      return okShallow({
        gridColumns: ts.columns,
        gridRows: ts.rows,
        tileWidth: ts.tileWidth,
        tileHeight: ts.tileHeight,
        totalTiles: tileCount,
        remapTable,
        placements: [placement],
      });
    }
  }

  // Build remap table and placements
  const remapTable = new Map<Num, Num>();
  const placements: TilesetPlacement[] = [];
  let megaAtlasOffset: Num = 0;

  for (const ts of tilesets) {
    const tileCount: Num = ts.columns * ts.rows;

    const placement: TilesetPlacement = {
      tilesetIndex: ts.tilesetIndex,
      megaAtlasOffset,
      tileCount,
      firstGid: ts.firstGid,
    };
    placements.push(placement);

    // Map each global ID to its mega-atlas local ID
    for (let i: Num = 0; i < tileCount; i++) {
      const globalId: Num = ts.firstGid + i;
      // Mega-atlas local IDs start at 1 (0 = empty tile)
      const localId: Num = megaAtlasOffset + i + 1;
      remapTable.set(globalId, localId);
    }

    megaAtlasOffset += tileCount;
  }

  return okShallow({
    gridColumns,
    gridRows,
    tileWidth,
    tileHeight,
    totalTiles,
    remapTable,
    placements,
  });
}

// =============================================================================
// remapTileIds
// =============================================================================

/**
 * Remaps an array of global tile IDs to mega-atlas local IDs.
 *
 * Empty tiles (ID 0) are preserved as 0. Non-empty IDs not found
 * in the remap table pass through unchanged.
 *
 * @param options - Tile IDs and remap table
 * @returns BabylonResult containing the remapped ID array
 *
 * @example
 * ```typescript
 * const remapped = remapTileIds({
 *   tileIds: [0, 1, 17, 0],
 *   remapTable: layout.remapTable,
 * });
 * ```
 */
export function remapTileIds(options: RemapTileIdsOptions): BabylonResult<Num[]> {
  const { tileIds, remapTable } = options;

  const remapped: Num[] = [];

  for (const id of tileIds) {
    if (id === 0) {
      remapped.push(0);
    } else {
      remapped.push(remapTable.get(id) ?? id);
    }
  }

  return okShallow(remapped);
}

// =============================================================================
// buildMegaAtlas
// =============================================================================

/** A tileset image entry for mega-atlas texture compositing. */
export const TilesetImageEntrySchema = v.pipe(
  v.strictObject({
    /** Tileset metadata. */
    entry: v.custom<TilesetEntry>((val): val is TilesetEntry => typeof val === 'object'),
    /** The tileset atlas image (HTMLImageElement, ImageBitmap, etc.). */
    image: v.custom<CanvasImageSource>((val): val is CanvasImageSource => typeof val === 'object'),
  }),
  v.readonly(),
);

/** A tileset image entry. */
export type TilesetImageEntry = v.InferOutput<typeof TilesetImageEntrySchema>;

/** Options schema for {@link buildMegaAtlas}. */
export const BuildMegaAtlasOptionsSchema = v.pipe(
  v.strictObject({
    /** The Babylon.js scene. */
    scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
    /** Tileset entries with their images for compositing. */
    tilesets: v.custom<readonly TilesetImageEntry[]>((val): val is readonly TilesetImageEntry[] =>
      Array.isArray(val),
    ),
  }),
  v.readonly(),
);

/** Options for {@link buildMegaAtlas}. */
export type BuildMegaAtlasOptions = v.InferOutput<typeof BuildMegaAtlasOptionsSchema>;

/** Result of mega-atlas texture building. */
export const MegaAtlasResultSchema = v.strictObject({
  /** The composited mega-atlas GPU texture. */
  texture: v.custom<BABYLON.RawTexture>(
    (val): val is BABYLON.RawTexture => val instanceof BABYLON.RawTexture,
  ),
  /** The mega-atlas layout (grid dimensions, remap table, placements). */
  layout: v.custom<MegaAtlasLayout>((val): val is MegaAtlasLayout => typeof val === 'object'),
});

/** Mega-atlas build result. */
export type MegaAtlasResult = v.InferOutput<typeof MegaAtlasResultSchema>;

/**
 * Packs multiple tileset atlas images into a single mega-atlas GPU texture.
 *
 * Combines {@link calculateMegaAtlasLayout} (logical layout) with canvas
 * compositing and GPU texture upload. Returns both the texture and layout
 * info (remap table, grid dimensions).
 *
 * @param options - Scene and tileset entries with images
 * @returns BabylonResult containing the mega-atlas texture and layout
 *
 * @example
 * ```typescript
 * const result = buildMegaAtlas({
 *   scene,
 *   tilesets: [
 *     { entry: { tilesetIndex: 0, columns: 8, rows: 6, tileWidth: 16, tileHeight: 16, firstGid: 1 }, image: img1 },
 *     { entry: { tilesetIndex: 1, columns: 4, rows: 4, tileWidth: 16, tileHeight: 16, firstGid: 49 }, image: img2 },
 *   ],
 * });
 * if (result.ok) {
 *   material.setTexture('tileAtlas', result.data.texture);
 * }
 * ```
 */
export function buildMegaAtlas(options: BuildMegaAtlasOptions): BabylonResult<MegaAtlasResult> {
  const { scene, tilesets } = options;

  if (tilesets.length === 0) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'At least one tileset is required for mega-atlas');
  }

  // Calculate layout
  const entries: TilesetEntry[] = tilesets.map((ts) => ts.entry);
  const layoutResult = calculateMegaAtlasLayout({ tilesets: entries });
  if (!layoutResult.ok) return layoutResult;

  const layout: MegaAtlasLayout = layoutResult.data;
  const atlasPixelWidth: Num = layout.gridColumns * layout.tileWidth;
  const atlasPixelHeight: Num = layout.gridRows * layout.tileHeight;

  try {
    // Composite tileset images onto an offscreen canvas
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = atlasPixelWidth;
    canvas.height = atlasPixelHeight;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!ctx) {
      return err(ERRORS.SCENE.RENDER_FAILED, 'Failed to get 2D canvas context for mega-atlas');
    }

    // Draw tiles in normal order (row 0 at top of canvas).
    for (const ts of tilesets) {
      const placement: TilesetPlacement | undefined = layout.placements.find(
        (p) => p.tilesetIndex === ts.entry.tilesetIndex,
      );
      if (!placement) continue;

      for (let localTile: Num = 0; localTile < placement.tileCount; localTile++) {
        const megaTile: Num = placement.megaAtlasOffset + localTile;
        const destCol: Num = megaTile % layout.gridColumns;
        const destRow: Num = Math.floor(megaTile / layout.gridColumns);

        const srcCol: Num = localTile % ts.entry.columns;
        const srcRow: Num = Math.floor(localTile / ts.entry.columns);

        ctx.drawImage(
          ts.image,
          srcCol * ts.entry.tileWidth,
          srcRow * ts.entry.tileHeight,
          ts.entry.tileWidth,
          ts.entry.tileHeight,
          destCol * layout.tileWidth,
          destRow * layout.tileHeight,
          layout.tileWidth,
          layout.tileHeight,
        );
      }
    }

    // Extract pixel data and upload as RawTexture.
    // invertY = true to match the convention used by tileset textures
    // loaded from URL (Babylon.js v8 default: invertY = !useOpenGLOrientationForUV = true).
    const imageData: ImageData = ctx.getImageData(0, 0, atlasPixelWidth, atlasPixelHeight);
    const texture: BABYLON.RawTexture = new BABYLON.RawTexture(
      new Uint8Array(imageData.data.buffer),
      atlasPixelWidth,
      atlasPixelHeight,
      BABYLON.Engine.TEXTUREFORMAT_RGBA,
      scene,
      false, // generateMipMaps
      false, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
    );
    texture.hasAlpha = true;
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    return okShallow({ texture, layout });
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

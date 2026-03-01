/**
 * Tileset loader — UV computation, texture loading, and tile ID resolution.
 *
 * Computes UV rectangles for each tile in a tileset atlas grid, loads
 * tileset images as Babylon.js textures with pixel-art sampling, and
 * resolves global tile IDs to their owning tileset + local index.
 *
 * @example
 * ```typescript
 * import { computeTileUVs, loadTileset, resolveGlobalTileId } from './tileset-loader';
 *
 * const uvs = computeTileUVs({ columns: 8, rows: 6, tileWidth: 48, tileHeight: 48 });
 * if (uvs.ok) uvs.data.length; // 48
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, okUnchecked, type DeepReadonly, type Result } from '@/schemas/result/result';
import type { Num, Str } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { TileUVSchema, type TileUV } from './tile-geometry';
import type { TilesetConfig } from '../schemas/map-data';

// =============================================================================
// Schemas
// =============================================================================

/** Options schema for {@link computeTileUVs}. */
export const ComputeTileUVsOptionsSchema = v.pipe(
	v.strictObject({
		/** Number of tile columns in the tileset image. */
		columns: v.number(),
		/** Number of tile rows in the tileset image. */
		rows: v.number(),
		/** Width of each tile in pixels (for half-pixel inset). */
		tileWidth: v.number(),
		/** Height of each tile in pixels (for half-pixel inset). */
		tileHeight: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link computeTileUVs}. */
export type ComputeTileUVsOptions = v.InferOutput<typeof ComputeTileUVsOptionsSchema>;

/** Options schema for {@link loadTileset}. */
export const LoadTilesetOptionsSchema = v.pipe(
	v.strictObject({
		/** The Babylon.js scene to create the texture in. */
		scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
		/** Tileset configuration from MapData. */
		config: v.custom<DeepReadonly<TilesetConfig>>(
			(val): val is DeepReadonly<TilesetConfig> => typeof val === 'object',
		),
		/** Base path for resolving image paths. */
		basePath: v.string(),
	}),
	v.readonly(),
);

/** Options for {@link loadTileset}. */
export type LoadTilesetOptions = v.InferOutput<typeof LoadTilesetOptionsSchema>;

/** Options schema for {@link resolveGlobalTileId}. */
export const ResolveGlobalTileIdOptionsSchema = v.pipe(
	v.strictObject({
		/** The global tile ID to resolve. */
		globalId: v.number(),
		/** Loaded tilesets sorted by firstGid ascending. */
		tilesets: v.custom<readonly LoadedTileset[]>((val): val is readonly LoadedTileset[] =>
			Array.isArray(val),
		),
	}),
	v.readonly(),
);

/** Options for {@link resolveGlobalTileId}. */
export type ResolveGlobalTileIdOptions = v.InferOutput<typeof ResolveGlobalTileIdOptionsSchema>;

/** A loaded tileset with texture and precomputed UV lookup. */
export const LoadedTilesetSchema = v.strictObject({
	/** Original tileset configuration. */
	config: v.custom<DeepReadonly<TilesetConfig>>(
		(val): val is DeepReadonly<TilesetConfig> => typeof val === 'object',
	),
	/** Babylon.js texture for this tileset. */
	texture: v.custom<BABYLON.Texture>(
		(val): val is BABYLON.Texture => val instanceof BABYLON.Texture,
	),
	/** Precomputed UV rectangles for each tile in the grid. */
	uvLookup: v.pipe(v.array(TileUVSchema), v.readonly()),
});

/** A loaded tileset with texture and precomputed UV lookup. */
export type LoadedTileset = v.InferOutput<typeof LoadedTilesetSchema>;

/** Result of resolving a global tile ID. */
export const ResolvedTileSchema = v.pipe(
	v.strictObject({
		/** The tileset this tile belongs to. */
		tileset: v.custom<LoadedTileset>((val): val is LoadedTileset => typeof val === 'object'),
		/** Local tile index within the tileset (0-based). */
		localIndex: v.number(),
	}),
	v.readonly(),
);

/** Result of resolving a global tile ID. */
export type ResolvedTile = v.InferOutput<typeof ResolvedTileSchema>;

// =============================================================================
// computeTileUVs
// =============================================================================

/**
 * Computes UV rectangles for every tile in a tileset grid.
 *
 * UV coordinates follow Babylon.js convention: V is bottom-to-top.
 * A half-pixel inset is applied to prevent texture bleeding at tile edges.
 *
 * @param options - Grid dimensions and tile pixel sizes
 * @returns Result containing array of TileUV rectangles
 *
 * @example
 * ```typescript
 * const result = computeTileUVs({ columns: 8, rows: 6, tileWidth: 48, tileHeight: 48 });
 * if (result.ok) result.data[0]; // { u0, v0, u1, v1 }
 * ```
 */
export function computeTileUVs(options: ComputeTileUVsOptions): Result<readonly TileUV[]> {
	const { columns, rows, tileWidth, tileHeight } = options;

	const halfU: Num = 0.5 / (columns * tileWidth);
	const halfV: Num = 0.5 / (rows * tileHeight);
	const uvs: TileUV[] = [];

	for (let row: Num = 0; row < rows; row++) {
		for (let col: Num = 0; col < columns; col++) {
			const u0: Num = col / columns + halfU;
			const u1: Num = (col + 1) / columns - halfU;
			const v0: Num = 1 - (row + 1) / rows + halfV;
			const v1: Num = 1 - row / rows - halfV;

			uvs.push({ u0, v0, u1, v1 });
		}
	}

	return okUnchecked(uvs);
}

// =============================================================================
// loadTileset
// =============================================================================

/**
 * Loads a tileset image as a Babylon.js texture and precomputes UV lookup.
 *
 * The texture is created with NEAREST sampling (pixel-art) and no mipmaps.
 *
 * @param options - Scene, tileset config, and asset base path
 * @returns BabylonResult containing the loaded tileset
 *
 * @example
 * ```typescript
 * const result = loadTileset({
 *   scene, config: tilesetConfig, basePath: '/assets/',
 * });
 * if (result.ok) result.data.texture; // BABYLON.Texture
 * ```
 */
export function loadTileset(options: LoadTilesetOptions): BabylonResult<LoadedTileset> {
	const { scene, config, basePath } = options;

	try {
		const imagePath: Str = `${basePath}${config.imagePath}` as Str;

		const texture: BABYLON.Texture = new BABYLON.Texture(
			imagePath,
			scene,
			true, // noMipmap
			undefined, // invertY
			BABYLON.Texture.NEAREST_SAMPLINGMODE,
		);
		texture.hasAlpha = true;

		// Detect compact autotile source: 2×3 block with terrain_48 type.
		// These are RPG Maker A2 format sources that should be interpreted as
		// an expanded 8×6 grid (48 tiles) after sub-tile composition.
		// The actual pixel expansion is done at build time by expand-autotiles.ts;
		// here we just adjust the UV grid dimensions.
		const isCompactAutotile: boolean =
			config.autotileType === 'terrain_48' && config.columns === 2 && config.rows === 3;
		const effectiveCols: Num = isCompactAutotile ? 8 : config.columns;
		const effectiveRows: Num = isCompactAutotile ? 6 : config.rows;

		const uvResult: Result<readonly TileUV[]> = computeTileUVs({
			columns: effectiveCols,
			rows: effectiveRows,
			tileWidth: config.tileWidth,
			tileHeight: config.tileHeight,
		});
		if (!uvResult.ok) return uvResult;

		const loaded: LoadedTileset = {
			config,
			texture,
			uvLookup: uvResult.data,
		};

		return okShallow(loaded);
	} catch (error: unknown) {
		return err(ERRORS.ASSET.IMPORT_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// resolveGlobalTileId
// =============================================================================

/**
 * Resolves a global tile ID to its owning tileset and local index.
 *
 * Global IDs are assigned per tileset via `firstGid`. ID 0 is always
 * empty (returns null). IDs beyond all tilesets also return null.
 *
 * Uses `uvLookup.length` as the authoritative tile count, which handles
 * expanded autotile tilesets where the config specifies 2×3 but the
 * actual UV lookup contains 48 entries (8×6 after autotile expansion).
 *
 * @param options - Global ID and available tilesets
 * @returns BabylonResult containing the resolved tile or null
 *
 * @example
 * ```typescript
 * const result = resolveGlobalTileId({ globalId: 5, tilesets });
 * if (result.ok && result.data) {
 *   result.data.tileset; // LoadedTileset
 *   result.data.localIndex; // 4 (if firstGid=1)
 * }
 * ```
 */
export function resolveGlobalTileId(
	options: ResolveGlobalTileIdOptions,
): BabylonResult<ResolvedTile | null> {
	const { globalId, tilesets } = options;

	if (globalId === 0) return okUnchecked(null);

	// Find the tileset with the highest firstGid that is <= globalId
	let matched: LoadedTileset | null = null;

	for (const tileset of tilesets) {
		if (
			tileset.config.firstGid <= globalId &&
			(!matched || tileset.config.firstGid > matched.config.firstGid)
		) {
			matched = tileset;
		}
	}

	if (!matched) return okUnchecked(null);

	const localIndex: Num = globalId - matched.config.firstGid;
	// Use uvLookup.length as the authoritative tile count — this handles
	// expanded autotile tilesets where config says 2×3 but UVs are 8×6.
	const totalTiles: Num = matched.uvLookup.length;

	// Out of range for this tileset
	if (localIndex >= totalTiles) return okUnchecked(null);

	return okShallow({ tileset: matched, localIndex });
}

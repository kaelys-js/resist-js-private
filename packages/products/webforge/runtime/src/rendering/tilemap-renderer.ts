/**
 * Tilemap renderer — top-level orchestrator for MapData → scene pipeline.
 *
 * Validates MapData JSON, loads tilesets, creates materials, builds chunk
 * meshes per layer, generates cliff geometry, and sets up tile animation.
 * Returns a RenderedTilemap handle for disposal and live editing.
 *
 * @example
 * ```typescript
 * import { renderTilemap, disposeTilemap } from './tilemap-renderer';
 *
 * const result = renderTilemap({
 *   scene, mapDataInput: mapJson, assetBasePath: '/assets/',
 * });
 * if (result.ok) {
 *   // tilemap is live in the scene
 *   disposeTilemap({ tilemap: result.data }); // cleanup
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, type DeepReadonly } from '@/schemas/result/result';
import type { Bool, Num, Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
	ChunkConfigSchema,
	MapDataSchema,
	type ChunkConfig,
	type MapData,
} from '../schemas/map-data';
import { loadTileset, type LoadedTileset } from './tileset-loader';
import { createTileMaterial } from './tile-material';
import { buildChunk, buildCliffChunk, rebuildChunk, type ChunkMesh } from './chunk-builder';
import {
	createTileAnimator,
	disposeTileAnimator,
	type TileAnimationManager,
} from './tile-animator';

// =============================================================================
// Schemas
// =============================================================================

/** A rendered tilemap with all meshes and resources. */
export const RenderedTilemapSchema = v.strictObject({
	/** Built chunk meshes (non-null only). */
	chunks: v.custom<ChunkMesh[]>((val): val is ChunkMesh[] => Array.isArray(val)),
	/** Cliff chunk meshes (non-null only). */
	cliffChunks: v.custom<ChunkMesh[]>((val): val is ChunkMesh[] => Array.isArray(val)),
	/** Loaded tilesets. */
	tilesets: v.custom<LoadedTileset[]>((val): val is LoadedTileset[] => Array.isArray(val)),
	/** Materials per tileset. */
	materials: v.custom<BABYLON.StandardMaterial[]>((val): val is BABYLON.StandardMaterial[] =>
		Array.isArray(val),
	),
	/** Tile animation manager. */
	animator: v.custom<TileAnimationManager>(
		(val): val is TileAnimationManager => typeof val === 'object',
	),
	/** Validated map data (readonly from safeParse). */
	mapData: v.custom<DeepReadonly<MapData>>(
		(val): val is DeepReadonly<MapData> => typeof val === 'object',
	),
	/** Chunk configuration (readonly from safeParse). */
	chunkConfig: v.custom<DeepReadonly<ChunkConfig>>(
		(val): val is DeepReadonly<ChunkConfig> => typeof val === 'object',
	),
	/** The Babylon.js scene. */
	scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
});

/** A rendered tilemap. */
export type RenderedTilemap = v.InferOutput<typeof RenderedTilemapSchema>;

/** Options schema for {@link renderTilemap}. */
export const RenderTilemapOptionsSchema = v.strictObject({
	/** The Babylon.js scene. */
	scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
	/** Raw MapData input (validated internally). */
	mapDataInput: v.unknown(),
	/** Base path for resolving tileset image paths. */
	assetBasePath: v.string(),
	/** Optional chunk configuration (validated internally). */
	chunkConfig: v.optional(v.unknown()),
});

/** Options for {@link renderTilemap}. */
export type RenderTilemapOptions = v.InferOutput<typeof RenderTilemapOptionsSchema>;

/** Options schema for {@link disposeTilemap}. */
export const DisposeTilemapOptionsSchema = v.strictObject({
	/** The tilemap to dispose. */
	tilemap: v.custom<RenderedTilemap>((val): val is RenderedTilemap => typeof val === 'object'),
});

/** Options for {@link disposeTilemap}. */
export type DisposeTilemapOptions = v.InferOutput<typeof DisposeTilemapOptionsSchema>;

/** Options schema for {@link updateTile}. */
export const UpdateTileOptionsSchema = v.strictObject({
	/** The tilemap to update. */
	tilemap: v.custom<RenderedTilemap>((val): val is RenderedTilemap => typeof val === 'object'),
	/** Layer index to update. */
	layerIndex: v.number(),
	/** Tile X position. */
	x: v.number(),
	/** Tile Z position. */
	z: v.number(),
	/** New tile ID to place. */
	newTileId: v.number(),
});

/** Options for {@link updateTile}. */
export type UpdateTileOptions = v.InferOutput<typeof UpdateTileOptionsSchema>;

// =============================================================================
// renderTilemap
// =============================================================================

/**
 * Renders a tilemap from raw MapData JSON into the Babylon.js scene.
 *
 * Validates input, loads tilesets, creates materials, builds chunk meshes
 * per layer, generates cliff geometry, and sets up tile animation.
 *
 * @param options - Scene, raw MapData, asset base path, and optional chunk config
 * @returns BabylonResult containing the rendered tilemap handle
 *
 * @example
 * ```typescript
 * const result = renderTilemap({
 *   scene, mapDataInput: mapJson, assetBasePath: '/assets/',
 * });
 * if (result.ok) result.data.chunks; // ChunkMesh[]
 * ```
 */
export function renderTilemap(options: RenderTilemapOptions): BabylonResult<RenderedTilemap> {
	const { scene, mapDataInput, assetBasePath, chunkConfig: chunkConfigInput } = options;

	try {
		// 1. Validate MapData
		const mapResult = safeParse(MapDataSchema, mapDataInput);
		if (!mapResult.ok) return mapResult;
		const mapData = mapResult.data;

		// 2. Validate ChunkConfig
		const chunkResult = safeParse(ChunkConfigSchema, chunkConfigInput ?? {});
		if (!chunkResult.ok) return chunkResult;
		const chunkConfig = chunkResult.data;

		// 3. Cross-field: layer.data.length === width * height
		const expectedLength: Num = mapData.width * mapData.height;
		for (const layer of mapData.layers) {
			if (layer.data.length !== expectedLength) {
				return err(
					ERRORS.VALIDATION.SCHEMA_FAILED,
					`Layer "${layer.name}" data length ${layer.data.length} does not match map size ${expectedLength}`,
				);
			}
		}

		// 4. Cross-field: heightMap length
		if (mapData.heightMap && mapData.heightMap.length !== expectedLength) {
			return err(
				ERRORS.VALIDATION.SCHEMA_FAILED,
				`heightMap length ${mapData.heightMap.length} does not match map size ${expectedLength}`,
			);
		}

		// 5. Load all tilesets
		const tilesets: LoadedTileset[] = [];
		for (const tilesetConfig of mapData.tilesets) {
			const loadResult = loadTileset({
				scene,
				config: tilesetConfig,
				basePath: assetBasePath as Str,
			});
			if (!loadResult.ok) return loadResult;
			tilesets.push(loadResult.data);
		}

		// 6. Create materials per tileset
		const materials: BABYLON.StandardMaterial[] = [];
		for (const tileset of tilesets) {
			const matResult = createTileMaterial({
				scene,
				name: `mat-${tileset.config.name}` as Str,
				texture: tileset.texture,
				hasAlpha: true as Bool,
			});
			if (!matResult.ok) return matResult;
			materials.push(matResult.data);
		}

		// 7. Calculate chunk grid
		const chunkSize: Num = chunkConfig.chunkSize;
		const chunksX: Num = Math.ceil(mapData.width / chunkSize);
		const chunksZ: Num = Math.ceil(mapData.height / chunkSize);

		// 8. Build context
		const buildContext = {
			scene,
			mapData,
			loadedTilesets: tilesets as readonly LoadedTileset[],
			materials: materials as readonly BABYLON.StandardMaterial[],
			tileWorldSize: 1 as Num,
			tileWorldHeight: 0.5 as Num,
			chunkSize,
		};

		// 9. Build chunks for each layer × chunk position
		const chunks: ChunkMesh[] = [];
		for (let layerIndex: Num = 0; layerIndex < mapData.layers.length; layerIndex++) {
			for (let cz: Num = 0; cz < chunksZ; cz++) {
				for (let cx: Num = 0; cx < chunksX; cx++) {
					const chunkResult2 = buildChunk({
						context: buildContext,
						layerIndex,
						chunkX: cx,
						chunkZ: cz,
					});
					if (!chunkResult2.ok) return chunkResult2;
					if (chunkResult2.data) {
						chunks.push(chunkResult2.data);
					}
				}
			}
		}

		// 10. Build cliff chunks if heightMap exists
		const cliffChunks: ChunkMesh[] = [];
		if (mapData.heightMap) {
			for (let cz: Num = 0; cz < chunksZ; cz++) {
				for (let cx: Num = 0; cx < chunksX; cx++) {
					const cliffResult = buildCliffChunk({
						context: buildContext,
						chunkX: cx,
						chunkZ: cz,
					});
					if (!cliffResult.ok) return cliffResult;
					if (cliffResult.data) {
						cliffChunks.push(cliffResult.data);
					}
				}
			}
		}

		// 11. Create tile animation manager
		const animResult = createTileAnimator({ scene });
		if (!animResult.ok) return animResult;

		// 12. Return RenderedTilemap
		const rendered: RenderedTilemap = {
			chunks,
			cliffChunks,
			tilesets,
			materials,
			animator: animResult.data,
			mapData,
			chunkConfig,
			scene,
		};

		return okShallow(rendered);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// disposeTilemap
// =============================================================================

/**
 * Disposes all resources for a rendered tilemap.
 *
 * Disposes all chunk meshes, cliff meshes, materials, textures,
 * and the tile animation manager.
 *
 * @param options - The tilemap to dispose
 * @returns BabylonResult indicating success
 *
 * @example
 * ```typescript
 * disposeTilemap({ tilemap: renderedTilemap });
 * ```
 */
export function disposeTilemap(options: DisposeTilemapOptions): BabylonResult<Bool> {
	const { tilemap } = options;

	try {
		// Dispose chunk meshes
		for (const chunk of tilemap.chunks) {
			chunk.mesh.dispose();
		}

		// Dispose cliff meshes
		for (const cliff of tilemap.cliffChunks) {
			cliff.mesh.dispose();
		}

		// Dispose animator
		disposeTileAnimator({ animator: tilemap.animator });

		// Dispose materials
		for (const material of tilemap.materials) {
			material.dispose();
		}

		// Dispose textures
		for (const tileset of tilemap.tilesets) {
			tileset.texture.dispose();
		}

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// updateTile
// =============================================================================

/**
 * Updates a single tile and rebuilds the affected chunk.
 *
 * Modifies the tile ID in the map data and rebuilds only the chunk
 * containing the specified tile position.
 *
 * @param options - Tilemap, layer index, tile position, and new tile ID
 * @returns BabylonResult containing the updated tilemap
 *
 * @example
 * ```typescript
 * const result = updateTile({
 *   tilemap, layerIndex: 0, x: 5, z: 3, newTileId: 7,
 * });
 * if (result.ok) result.data; // updated RenderedTilemap
 * ```
 */
export function updateTile(options: UpdateTileOptions): BabylonResult<RenderedTilemap> {
	const { tilemap, layerIndex, x, z, newTileId } = options;

	try {
		const { mapData, chunkConfig, scene } = tilemap;
		const layer = mapData.layers[layerIndex];
		if (!layer) {
			return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Invalid layer index');
		}

		// Update tile data
		const mutableData: Num[] = [...layer.data];
		mutableData[z * mapData.width + x] = newTileId;

		// Create updated layer with new data
		const updatedLayers = mapData.layers.map((l, i) => {
			if (i === layerIndex) {
				return { ...l, data: mutableData };
			}
			return l;
		});

		const updatedMapData: DeepReadonly<MapData> = { ...mapData, layers: updatedLayers };

		// Find affected chunk
		const chunkSize: Num = chunkConfig.chunkSize;
		const chunkX: Num = Math.floor(x / chunkSize);
		const chunkZ: Num = Math.floor(z / chunkSize);

		// Find and remove existing chunk for this position + layer
		const existingIdx: Num = tilemap.chunks.findIndex(
			(c) => c.chunkX === chunkX && c.chunkZ === chunkZ && c.layerIndex === layerIndex,
		);
		const existingMesh: BABYLON.Mesh | null =
			existingIdx >= 0 ? (tilemap.chunks[existingIdx]?.mesh ?? null) : null;

		// Build context with updated map data
		const buildContext = {
			scene,
			mapData: updatedMapData,
			loadedTilesets: tilemap.tilesets as readonly LoadedTileset[],
			materials: tilemap.materials as readonly BABYLON.StandardMaterial[],
			tileWorldSize: 1 as Num,
			tileWorldHeight: 0.5 as Num,
			chunkSize,
		};

		// Rebuild chunk
		const rebuildResult = rebuildChunk({
			context: buildContext,
			layerIndex,
			chunkX,
			chunkZ,
			existingMesh,
		});
		if (!rebuildResult.ok) return rebuildResult;

		// Update chunks array
		const updatedChunks: ChunkMesh[] = tilemap.chunks.filter(
			(c) => !(c.chunkX === chunkX && c.chunkZ === chunkZ && c.layerIndex === layerIndex),
		);
		if (rebuildResult.data) {
			updatedChunks.push(rebuildResult.data);
		}

		const updatedTilemap: RenderedTilemap = {
			...tilemap,
			chunks: updatedChunks,
			mapData: updatedMapData,
		};

		return okShallow(updatedTilemap);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

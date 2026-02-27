/**
 * Chunk builder — merged mesh construction per chunk region.
 *
 * Combines tileset loader, autotile resolver, tile geometry, and cliff
 * generator to produce a single Babylon.js Mesh per 16x16 chunk per layer.
 * This gives one draw call per chunk instead of one per tile.
 *
 * @example
 * ```typescript
 * import { buildChunk, buildCliffChunk } from './chunk-builder';
 *
 * const result = buildChunk({ context, layerIndex: 0, chunkX: 0, chunkZ: 0 });
 * if (result.ok && result.data) result.data.mesh; // BABYLON.Mesh
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, type DeepReadonly } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { AutotileType, MapData } from '../schemas/map-data';
import {
	createFlatTileGeometry,
	mergeTileVertexData,
	LAYER_Y_OFFSETS,
	type TileUV,
	type TileVertexData,
} from './tile-geometry';
import { resolveGlobalTileId, type LoadedTileset } from './tileset-loader';
import { detectCliffEdges, generateCliffGeometry } from './cliff-generator';
import { resolveAutotile } from './autotile-resolver';

// =============================================================================
// Schemas
// =============================================================================

/** A built chunk mesh with metadata. */
export const ChunkMeshSchema = v.strictObject({
	/** The Babylon.js mesh for this chunk. */
	mesh: v.custom<BABYLON.Mesh>((val): val is BABYLON.Mesh => val instanceof BABYLON.Mesh),
	/** Chunk X position in the chunk grid. */
	chunkX: v.number(),
	/** Chunk Z position in the chunk grid. */
	chunkZ: v.number(),
	/** Layer index this chunk belongs to. */
	layerIndex: v.number(),
	/** Number of non-empty tiles in this chunk. */
	tileCount: v.number(),
});

/** A built chunk mesh. */
export type ChunkMesh = v.InferOutput<typeof ChunkMeshSchema>;

/** Context required to build chunks. */
export const ChunkBuildContextSchema = v.strictObject({
	/** The Babylon.js scene. */
	scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
	/** Validated map data (readonly from safeParse). */
	mapData: v.custom<DeepReadonly<MapData>>(
		(val): val is DeepReadonly<MapData> => typeof val === 'object',
	),
	/** Loaded tilesets with textures and UV lookups. */
	loadedTilesets: v.custom<readonly LoadedTileset[]>((val): val is readonly LoadedTileset[] =>
		Array.isArray(val),
	),
	/** Materials per tileset (same order as loadedTilesets). */
	materials: v.custom<readonly BABYLON.StandardMaterial[]>(
		(val): val is readonly BABYLON.StandardMaterial[] => Array.isArray(val),
	),
	/** Size of one tile in world units. */
	tileWorldSize: v.number(),
	/** Height of one tile level in world units. */
	tileWorldHeight: v.number(),
	/** Chunk size in tiles (e.g. 16). */
	chunkSize: v.number(),
});

/** Context for building chunks. */
export type ChunkBuildContext = v.InferOutput<typeof ChunkBuildContextSchema>;

/** Options schema for {@link buildChunk}. */
export const BuildChunkOptionsSchema = v.pipe(
	v.strictObject({
		/** Build context. */
		context: v.custom<ChunkBuildContext>(
			(val): val is ChunkBuildContext => typeof val === 'object',
		),
		/** Layer index to build. */
		layerIndex: v.number(),
		/** Chunk X position in chunk grid. */
		chunkX: v.number(),
		/** Chunk Z position in chunk grid. */
		chunkZ: v.number(),
		/** Existing mesh to update in-place instead of creating a new one. */
		existingMesh: v.optional(
			v.nullable(v.custom<BABYLON.Mesh>((val): val is BABYLON.Mesh => val instanceof BABYLON.Mesh)),
		),
	}),
	v.readonly(),
);

/** Options for {@link buildChunk}. */
export type BuildChunkOptions = v.InferOutput<typeof BuildChunkOptionsSchema>;

/** Options schema for {@link buildCliffChunk}. */
export const BuildCliffChunkOptionsSchema = v.pipe(
	v.strictObject({
		/** Build context. */
		context: v.custom<ChunkBuildContext>(
			(val): val is ChunkBuildContext => typeof val === 'object',
		),
		/** Chunk X position in chunk grid. */
		chunkX: v.number(),
		/** Chunk Z position in chunk grid. */
		chunkZ: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link buildCliffChunk}. */
export type BuildCliffChunkOptions = v.InferOutput<typeof BuildCliffChunkOptionsSchema>;

/** Options schema for {@link rebuildChunk}. */
export const RebuildChunkOptionsSchema = v.pipe(
	v.strictObject({
		/** Build context. */
		context: v.custom<ChunkBuildContext>(
			(val): val is ChunkBuildContext => typeof val === 'object',
		),
		/** Layer index to rebuild. */
		layerIndex: v.number(),
		/** Chunk X position in chunk grid. */
		chunkX: v.number(),
		/** Chunk Z position in chunk grid. */
		chunkZ: v.number(),
		/** Existing mesh to update in-place (null if none). */
		existingMesh: v.nullable(
			v.custom<BABYLON.Mesh>((val): val is BABYLON.Mesh => val instanceof BABYLON.Mesh),
		),
	}),
	v.readonly(),
);

/** Options for {@link rebuildChunk}. */
export type RebuildChunkOptions = v.InferOutput<typeof RebuildChunkOptionsSchema>;

// =============================================================================
// buildChunk
// =============================================================================

/**
 * Builds a merged mesh for one chunk of one layer.
 *
 * Iterates tiles in the chunk region, resolves tile IDs to UV lookups,
 * generates flat tile geometry, and merges into a single mesh.
 *
 * @param options - Build context, layer index, and chunk position
 * @returns BabylonResult containing the chunk mesh or null if all empty
 *
 * @example
 * ```typescript
 * const result = buildChunk({ context, layerIndex: 0, chunkX: 0, chunkZ: 0 });
 * if (result.ok && result.data) scene.addMesh(result.data.mesh);
 * ```
 */
export function buildChunk(options: BuildChunkOptions): BabylonResult<ChunkMesh | null> {
	const { context, layerIndex, chunkX, chunkZ, existingMesh } = options;
	const { scene, mapData, loadedTilesets, materials, tileWorldSize, tileWorldHeight, chunkSize } =
		context;

	try {
		const layer = mapData.layers[layerIndex];
		if (!layer) return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Invalid layer index');

		// Only tile layers produce chunk geometry
		if (layer.kind !== 'tile') return okShallow(null);

		// Skip hidden layers
		if (!layer.visible) return okShallow(null);

		const startX: Num = chunkX * chunkSize;
		const startZ: Num = chunkZ * chunkSize;
		const endX: Num = Math.min(startX + chunkSize, mapData.width);
		const endZ: Num = Math.min(startZ + chunkSize, mapData.height);

		if (startX >= mapData.width || startZ >= mapData.height) {
			return okShallow(null);
		}

		const layerYOffset: Num = LAYER_Y_OFFSETS[layer.type] ?? 0;

		const tileParts: TileVertexData[] = [];
		let tileCount: Num = 0;
		let indexOffset: Num = 0;
		let firstMaterialIndex: Num = 0;

		for (let z: Num = startZ; z < endZ; z++) {
			for (let x: Num = startX; x < endX; x++) {
				const tileId: Num = layer.data[z * mapData.width + x] ?? 0;
				if (tileId === 0) continue;

				const resolved = resolveGlobalTileId({ globalId: tileId, tilesets: loadedTilesets });
				if (!resolved.ok) return resolved;
				if (!resolved.data) continue;

				const { tileset, localIndex } = resolved.data;

				// Determine UV based on autotile type
				let uv: TileUV;
				const autotileType: AutotileType = tileset.config.autotileType as AutotileType;
				if (autotileType !== 'none' && autotileType !== 'animated_terrain') {
					const frameResult = resolveAutotile({
						x,
						y: z,
						mapWidth: mapData.width,
						mapHeight: mapData.height,
						layerData: layer.data,
						tileId,
						autotileType,
					});
					if (!frameResult.ok) return frameResult;
					// oxlint-disable-next-line typescript/no-non-null-assertion -- uvLookup[0] exists
					uv = tileset.uvLookup[frameResult.data] ?? tileset.uvLookup[0]!;
				} else {
					// oxlint-disable-next-line typescript/no-non-null-assertion -- uvLookup[0] exists
					uv = tileset.uvLookup[localIndex] ?? tileset.uvLookup[0]!;
				}

				// Get tile height from heightMap
				const heightLevel: Num = mapData.heightMap
					? (mapData.heightMap[z * mapData.width + x] ?? 0)
					: 0;
				const heightY: Num = heightLevel * tileWorldHeight + layerYOffset;

				const tileResult = createFlatTileGeometry({
					gridX: x,
					gridZ: z,
					heightY,
					tileWorldSize,
					uv,
					indexOffset,
				});
				if (!tileResult.ok) return tileResult;

				tileParts.push(tileResult.data);
				indexOffset += tileResult.data.vertexCount;
				tileCount++;

				// Track material index from first resolved tile
				if (tileCount === 1) {
					firstMaterialIndex = loadedTilesets.findIndex(
						(ts) => ts.config.firstGid === tileset.config.firstGid,
					);
				}
			}
		}

		if (tileParts.length === 0) {
			// Hide existing mesh if chunk is now empty (don't dispose — allows reuse)
			if (existingMesh) existingMesh.setEnabled(false);
			return okShallow(null);
		}

		const mergeResult = mergeTileVertexData(tileParts);
		if (!mergeResult.ok) return mergeResult;

		const vertexData: BABYLON.VertexData = new BABYLON.VertexData();
		vertexData.positions = [...mergeResult.data.positions];
		vertexData.normals = [...mergeResult.data.normals];
		vertexData.uvs = [...mergeResult.data.uvs];
		vertexData.indices = [...mergeResult.data.indices];

		// Reuse existing mesh (in-place update) or create a new one
		const mesh: BABYLON.Mesh =
			existingMesh ?? new BABYLON.Mesh(`chunk-${chunkX}-${chunkZ}-${layer.name}`, scene);

		if (!existingMesh) {
			// New mesh: hide until fully configured to avoid a flash frame
			mesh.setEnabled(false);
		}

		// Apply vertex data — use updatable=true so future rebuilds can update in-place
		vertexData.applyToMesh(mesh, true);

		const material: BABYLON.StandardMaterial | undefined = materials[firstMaterialIndex];
		if (material) mesh.material = material;

		// Apply layer opacity to mesh visibility
		mesh.visibility = layer.opacity;

		// Enable for rendering (no-op if already enabled on in-place update)
		mesh.setEnabled(true);

		const chunkMesh: ChunkMesh = {
			mesh,
			chunkX,
			chunkZ,
			layerIndex,
			tileCount,
		};

		return okShallow(chunkMesh);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// buildCliffChunk
// =============================================================================

/**
 * Builds cliff face geometry for height differences in a chunk.
 *
 * @param options - Build context and chunk position
 * @returns BabylonResult containing cliff mesh or null if no cliffs
 *
 * @example
 * ```typescript
 * const result = buildCliffChunk({ context, chunkX: 0, chunkZ: 0 });
 * if (result.ok && result.data) scene.addMesh(result.data.mesh);
 * ```
 */
export function buildCliffChunk(options: BuildCliffChunkOptions): BabylonResult<ChunkMesh | null> {
	const { context, chunkX, chunkZ } = options;
	const { scene, mapData, materials, tileWorldSize, tileWorldHeight, chunkSize } = context;

	try {
		if (!mapData.heightMap) return okShallow(null);

		const startX: Num = chunkX * chunkSize;
		const startZ: Num = chunkZ * chunkSize;
		const endX: Num = Math.min(startX + chunkSize, mapData.width);
		const endZ: Num = Math.min(startZ + chunkSize, mapData.height);

		if (startX >= mapData.width || startZ >= mapData.height) {
			return okShallow(null);
		}

		const edgeResult = detectCliffEdges({
			heightMap: mapData.heightMap,
			mapWidth: mapData.width,
			mapHeight: mapData.height,
			startX,
			startZ,
			endX,
			endZ,
		});
		if (!edgeResult.ok) return edgeResult;
		if (edgeResult.data.length === 0) return okShallow(null);

		// Pick a cliff wall UV from the first tileset.
		// Prefer tile at local index 51 (LPC cobble solid fill at row 3, col 3),
		// then fall back to tile 0, then fall back to full atlas (last resort).
		const CLIFF_TILE_INDEX: Num = 51;
		const [firstTileset]: readonly LoadedTileset[] = context.loadedTilesets;
		const wallUV: TileUV = firstTileset?.uvLookup[CLIFF_TILE_INDEX] ??
			firstTileset?.uvLookup[0] ?? { u0: 0, v0: 0, u1: 1, v1: 1 };

		const geoResult = generateCliffGeometry({
			edges: edgeResult.data,
			tileWorldSize,
			tileWorldHeight,
			wallUV,
			indexOffset: 0,
		});
		if (!geoResult.ok) return geoResult;

		const meshName = `cliff-${chunkX}-${chunkZ}`;
		const mesh: BABYLON.Mesh = new BABYLON.Mesh(meshName, scene);
		mesh.setEnabled(false);

		const vertexData: BABYLON.VertexData = new BABYLON.VertexData();
		vertexData.positions = [...geoResult.data.positions];
		vertexData.normals = [...geoResult.data.normals];
		vertexData.uvs = [...geoResult.data.uvs];
		vertexData.indices = [...geoResult.data.indices];
		vertexData.applyToMesh(mesh);

		// oxlint-disable-next-line prefer-destructuring
		const material: BABYLON.StandardMaterial | undefined = materials[0];
		if (material) mesh.material = material;

		mesh.setEnabled(true);

		const chunkMesh: ChunkMesh = {
			mesh,
			chunkX,
			chunkZ,
			layerIndex: -1,
			tileCount: edgeResult.data.length,
		};

		return okShallow(chunkMesh);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// rebuildChunk
// =============================================================================

/**
 * Rebuilds a chunk by updating vertex data in-place on the existing mesh.
 *
 * In-place update avoids the visual flash that occurs when creating a new mesh
 * and disposing the old one. The existing mesh stays in the scene graph with its
 * renderingGroupId and material intact — only its geometry changes.
 *
 * Used by the editor when a single tile changes — only the affected
 * chunk needs rebuilding, not the entire map.
 *
 * @param options - Build context, position, and existing mesh to update
 * @returns BabylonResult containing updated chunk mesh or null if empty
 *
 * @example
 * ```typescript
 * const result = rebuildChunk({
 *   context, layerIndex: 0, chunkX: 0, chunkZ: 0, existingMesh: oldMesh,
 * });
 * ```
 */
export function rebuildChunk(options: RebuildChunkOptions): BabylonResult<ChunkMesh | null> {
	const { context, layerIndex, chunkX, chunkZ, existingMesh } = options;

	// Update vertex data in-place on the existing mesh to avoid the visual flash
	// that occurs when creating a new mesh and disposing the old one.
	return buildChunk({ context, layerIndex, chunkX, chunkZ, existingMesh });
}

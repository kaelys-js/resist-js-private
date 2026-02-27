/**
 * Tile geometry generation — pure math, no Babylon.js dependency.
 *
 * Generates raw vertex buffer data (positions, normals, UVs, indices)
 * for flat tile quads and vertical wall faces. Used by the chunk builder
 * to create merged meshes per chunk.
 *
 * @example
 * ```typescript
 * import { createFlatTileGeometry, mergeTileVertexData } from './tile-geometry';
 *
 * const uv: TileUV = { u0: 0, v0: 0, u1: 0.125, v1: 0.167 };
 * const tile = createFlatTileGeometry({ gridX: 0, gridZ: 0, heightY: 0, tileWorldSize: 1, uv, indexOffset: 0 });
 * if (tile.ok) {
 *   tile.data.vertexCount; // 4
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num, Str } from '@/schemas/common';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Types
// =============================================================================

/**
 * UV rectangle for one tile in a tileset atlas.
 *
 * Coordinates are in normalized 0–1 texture space.
 * `u0,v0` is bottom-left, `u1,v1` is top-right (Babylon.js convention).
 */
export const TileUVSchema = v.strictObject({
	/** Left edge U coordinate. */
	u0: v.number(),
	/** Bottom edge V coordinate. */
	v0: v.number(),
	/** Right edge U coordinate. */
	u1: v.number(),
	/** Top edge V coordinate. */
	v1: v.number(),
});

/** UV rectangle for one tile in a tileset atlas. */
export type TileUV = v.InferOutput<typeof TileUVSchema>;

/** Schema for Float32Array fields (v.instance generic workaround for TS 5.7+). */
const Float32ArraySchema = v.custom<Float32Array<ArrayBufferLike>>(
	(val): val is Float32Array<ArrayBufferLike> => val instanceof Float32Array,
);

/** Schema for Uint32Array fields (v.instance generic workaround for TS 5.7+). */
const Uint32ArraySchema = v.custom<Uint32Array<ArrayBufferLike>>(
	(val): val is Uint32Array<ArrayBufferLike> => val instanceof Uint32Array,
);

/**
 * Raw vertex data schema for one or more tiles.
 *
 * Contains typed arrays ready to be set on a Babylon.js VertexData object.
 * All arrays are pre-allocated to exact size.
 */
export const TileVertexDataSchema = v.pipe(
	v.strictObject({
		/** Flat XYZ positions (length = vertexCount × 3). */
		positions: Float32ArraySchema,
		/** Flat XYZ normals (length = vertexCount × 3). */
		normals: Float32ArraySchema,
		/** Flat UV coordinates (length = vertexCount × 2). */
		uvs: Float32ArraySchema,
		/** Triangle indices (length = triangleCount × 3). */
		indices: Uint32ArraySchema,
		/** Number of vertices in this data. */
		vertexCount: v.number(),
	}),
	v.readonly(),
);

/** Raw vertex data for one or more tiles. */
export type TileVertexData = v.InferOutput<typeof TileVertexDataSchema>;

/**
 * Wall face direction for cliff geometry.
 *
 * - `'north'` — wall faces toward -Z (visible from the north/top of map)
 * - `'south'` — wall faces toward +Z (visible from the south/bottom)
 * - `'east'` — wall faces toward +X (visible from the east/right)
 * - `'west'` — wall faces toward -X (visible from the west/left)
 */
export const WallDirectionSchema = v.picklist(['north', 'south', 'east', 'west']);

/** Wall face direction. */
export type WallDirection = v.InferOutput<typeof WallDirectionSchema>;

/** Options schema for {@link createFlatTileGeometry}. */
export const FlatTileOptionsSchema = v.pipe(
	v.strictObject({
		/** Tile grid X coordinate. */
		gridX: v.number(),
		/** Tile grid Z coordinate. */
		gridZ: v.number(),
		/** World Y height for the tile surface. */
		heightY: v.number(),
		/** Size of one tile in world units. */
		tileWorldSize: v.number(),
		/** UV rectangle from the tileset atlas. */
		uv: TileUVSchema,
		/** Starting vertex index (for merging multiple tiles). */
		indexOffset: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link createFlatTileGeometry}. */
export type FlatTileOptions = v.InferOutput<typeof FlatTileOptionsSchema>;

/** Options schema for {@link createWallFaceGeometry}. */
export const WallFaceOptionsSchema = v.pipe(
	v.strictObject({
		/** Tile grid X coordinate. */
		gridX: v.number(),
		/** Tile grid Z coordinate. */
		gridZ: v.number(),
		/** World Y height at the top of the wall. */
		topY: v.number(),
		/** World Y height at the bottom of the wall. */
		bottomY: v.number(),
		/** Which side of the tile the wall faces. */
		direction: WallDirectionSchema,
		/** Size of one tile in world units. */
		tileWorldSize: v.number(),
		/** UV rectangle for the wall texture. */
		uv: TileUVSchema,
		/** Starting vertex index (for merging). */
		indexOffset: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link createWallFaceGeometry}. */
export type WallFaceOptions = v.InferOutput<typeof WallFaceOptionsSchema>;

// =============================================================================
// Layer Y Offsets
// =============================================================================

/**
 * Micro Y-offsets per layer type to prevent Z-fighting between overlapping layers.
 *
 * Values are in world units (fractions of tile height). The 5 preset layer types
 * have predefined offsets; custom layer types will fall back to 0 via `?? 0`.
 */
export const LAYER_Y_OFFSETS: Readonly<Record<Str, Num>> = {
	ground: 0.0,
	ground_deco: 0.001,
	upper1: 0.002,
	upper2: 0.003,
	shadow: -0.001,
};

// =============================================================================
// Flat Tile Geometry
// =============================================================================

/**
 * Creates vertex data for a flat tile quad on the XZ plane.
 *
 * The quad occupies one tile-sized square at the given grid position and
 * height, with normals pointing up (0, 1, 0).
 *
 * @param options - Flat tile generation options
 * @returns Result containing vertex data (4 vertices, 6 indices)
 *
 * @example
 * ```typescript
 * const result = createFlatTileGeometry({
 *   gridX: 0, gridZ: 0, heightY: 0, tileWorldSize: 1,
 *   uv: { u0: 0, v0: 0, u1: 1, v1: 1 }, indexOffset: 0,
 * });
 * if (result.ok) {
 *   result.data.positions; // Float32Array [0,0,0, 1,0,0, 1,0,1, 0,0,1]
 * }
 * ```
 */
export function createFlatTileGeometry(options: FlatTileOptions): BabylonResult<TileVertexData> {
	const { gridX, gridZ, heightY, tileWorldSize, uv, indexOffset } = options;

	const x: Num = gridX * tileWorldSize;
	const z: Num = gridZ * tileWorldSize;
	const x1: Num = x + tileWorldSize;
	const z1: Num = z + tileWorldSize;

	// 4 vertices: bottom-left, bottom-right, top-right, top-left
	const positions: Float32Array = new Float32Array([
		x,
		heightY,
		z,
		x1,
		heightY,
		z,
		x1,
		heightY,
		z1,
		x,
		heightY,
		z1,
	]);

	// All normals point up
	const normals: Float32Array = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);

	// UV mapping: bottom-left → bottom-right → top-right → top-left
	const uvs: Float32Array = new Float32Array([
		uv.u0,
		uv.v0,
		uv.u1,
		uv.v0,
		uv.u1,
		uv.v1,
		uv.u0,
		uv.v1,
	]);

	// Two CCW triangles
	const base: Num = indexOffset;
	const indices: Uint32Array = new Uint32Array([
		base,
		base + 1,
		base + 2,
		base,
		base + 2,
		base + 3,
	]);

	return okShallow({
		positions,
		normals,
		uvs,
		indices,
		vertexCount: 4,
	});
}

// =============================================================================
// Wall Face Geometry
// =============================================================================

/**
 * Creates vertex data for a vertical wall face (cliff side).
 *
 * The wall spans one tile width in the appropriate direction, from
 * `bottomY` to `topY` in world height. Normal points outward from the
 * wall surface.
 *
 * @param options - Wall face generation options
 * @returns Result containing vertex data (4 vertices, 6 indices)
 *
 * @example
 * ```typescript
 * const result = createWallFaceGeometry({
 *   gridX: 2, gridZ: 3, topY: 2, bottomY: 0,
 *   direction: 'south', tileWorldSize: 1,
 *   uv: { u0: 0, v0: 0, u1: 1, v1: 1 }, indexOffset: 0,
 * });
 * if (result.ok) {
 *   result.data.vertexCount; // 4
 * }
 * ```
 */
export function createWallFaceGeometry(options: WallFaceOptions): BabylonResult<TileVertexData> {
	const { gridX, gridZ, topY, bottomY, direction, tileWorldSize, uv, indexOffset } = options;

	if (topY <= bottomY) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, 'topY must be greater than bottomY');
	}

	const x: Num = gridX * tileWorldSize;
	const z: Num = gridZ * tileWorldSize;
	const x1: Num = x + tileWorldSize;
	const z1: Num = z + tileWorldSize;

	const heightDiff: Num = topY - bottomY;
	const vTop: Num = uv.v1;
	const vBottom: Num = uv.v0 - (uv.v1 - uv.v0) * (heightDiff - 1);

	let positions: Float32Array;
	let normals: Float32Array;

	switch (direction) {
		case 'south': {
			positions = new Float32Array([x, bottomY, z1, x1, bottomY, z1, x1, topY, z1, x, topY, z1]);
			normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
			break;
		}
		case 'north': {
			positions = new Float32Array([x1, bottomY, z, x, bottomY, z, x, topY, z, x1, topY, z]);
			normals = new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
			break;
		}
		case 'east': {
			positions = new Float32Array([x1, bottomY, z1, x1, bottomY, z, x1, topY, z, x1, topY, z1]);
			normals = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
			break;
		}
		case 'west': {
			positions = new Float32Array([x, bottomY, z, x, bottomY, z1, x, topY, z1, x, topY, z]);
			normals = new Float32Array([-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0]);
			break;
		}
	}

	// UV tiled vertically for multi-level cliffs
	const uvs: Float32Array = new Float32Array([
		uv.u0,
		vBottom,
		uv.u1,
		vBottom,
		uv.u1,
		vTop,
		uv.u0,
		vTop,
	]);

	const base: Num = indexOffset;
	const indices: Uint32Array = new Uint32Array([
		base,
		base + 1,
		base + 2,
		base,
		base + 2,
		base + 3,
	]);

	return okShallow({
		positions,
		normals,
		uvs,
		indices,
		vertexCount: 4,
	});
}

// =============================================================================
// Merge
// =============================================================================

/**
 * Merges multiple tile vertex data arrays into a single combined buffer.
 *
 * Index values are automatically offset by cumulative vertex count so
 * the merged buffer can be used directly as a single mesh.
 *
 * @param tiles - Array of vertex data to merge
 * @returns Result containing merged vertex data, or empty data for empty input
 *
 * @example
 * ```typescript
 * const merged = mergeTileVertexData([tileA.data, tileB.data]);
 * if (merged.ok) {
 *   merged.data.vertexCount; // tileA.vertexCount + tileB.vertexCount
 * }
 * ```
 */
export function mergeTileVertexData(
	tiles: readonly TileVertexData[],
): BabylonResult<TileVertexData> {
	if (tiles.length === 0) {
		return okShallow({
			positions: new Float32Array(0),
			normals: new Float32Array(0),
			uvs: new Float32Array(0),
			indices: new Uint32Array(0),
			vertexCount: 0,
		});
	}

	let totalVertices: Num = 0;
	let totalIndices: Num = 0;

	for (const tile of tiles) {
		totalVertices += tile.vertexCount;
		totalIndices += tile.indices.length;
	}

	const positions: Float32Array = new Float32Array(totalVertices * 3);
	const normals: Float32Array = new Float32Array(totalVertices * 3);
	const uvs: Float32Array = new Float32Array(totalVertices * 2);
	const indices: Uint32Array = new Uint32Array(totalIndices);

	let posOffset: Num = 0;
	let uvOffset: Num = 0;
	let idxOffset: Num = 0;
	let vertexOffset: Num = 0;

	for (const tile of tiles) {
		positions.set(tile.positions, posOffset);
		normals.set(tile.normals, posOffset);
		uvs.set(tile.uvs, uvOffset);

		// Rebase indices relative to merged buffer
		const baseIndex: Num = tile.indices[0] ?? 0;
		for (let i: Num = 0; i < tile.indices.length; i++) {
			const srcIndex: Num = tile.indices[i] ?? 0;
			indices[idxOffset + i] = srcIndex - baseIndex + vertexOffset;
		}

		posOffset += tile.vertexCount * 3;
		uvOffset += tile.vertexCount * 2;
		idxOffset += tile.indices.length;
		vertexOffset += tile.vertexCount;
	}

	return okShallow({
		positions,
		normals,
		uvs,
		indices,
		vertexCount: totalVertices,
	});
}

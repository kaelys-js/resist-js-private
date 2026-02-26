/**
 * Cliff generator — height map analysis and cliff face geometry.
 *
 * Scans a region of the height map for height differences between adjacent
 * tiles. Where a tile is higher than its neighbor, a vertical wall face
 * (cliff) is generated on that side.
 *
 * @example
 * ```typescript
 * import { detectCliffEdges, generateCliffGeometry } from './cliff-generator';
 *
 * const edges = detectCliffEdges({
 *   heightMap: [0, 0, 0, 0, 1, 0, 0, 0, 0],
 *   mapWidth: 3, mapHeight: 3,
 *   startX: 0, startZ: 0, endX: 3, endZ: 3,
 * });
 * if (edges.ok) {
 *   const geo = generateCliffGeometry({
 *     edges: edges.data, tileWorldSize: 1, tileWorldHeight: 1,
 *     wallUV: { u0: 0, v0: 0, u1: 1, v1: 1 }, indexOffset: 0,
 *   });
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { okUnchecked, type Result } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';

import {
	createWallFaceGeometry,
	mergeTileVertexData,
	TileUVSchema,
	WallDirectionSchema,
	type TileVertexData,
	type WallDirection,
} from './tile-geometry';
import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a single cliff edge detected between height levels. */
export const CliffEdgeSchema = v.pipe(
	v.strictObject({
		/** Tile X position in the map grid. */
		x: v.number(),
		/** Tile Z position in the map grid. */
		z: v.number(),
		/** Which side of the tile the cliff face is on. */
		direction: WallDirectionSchema,
		/** Height level at the top of the cliff. */
		topHeight: v.number(),
		/** Height level at the bottom of the cliff. */
		bottomHeight: v.number(),
	}),
	v.readonly(),
);

/** A single cliff edge detected between height levels. */
export type CliffEdge = v.InferOutput<typeof CliffEdgeSchema>;

/** Options schema for {@link detectCliffEdges}. */
export const DetectCliffEdgesOptionsSchema = v.pipe(
	v.strictObject({
		/** Flat row-major height map (values 0–15). */
		heightMap: v.pipe(v.array(v.number()), v.readonly()),
		/** Map width in tiles. */
		mapWidth: v.number(),
		/** Map height in tiles. */
		mapHeight: v.number(),
		/** Region start X (inclusive). */
		startX: v.number(),
		/** Region start Z (inclusive). */
		startZ: v.number(),
		/** Region end X (exclusive). */
		endX: v.number(),
		/** Region end Z (exclusive). */
		endZ: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link detectCliffEdges}. */
export type DetectCliffEdgesOptions = v.InferOutput<typeof DetectCliffEdgesOptionsSchema>;

/** Options schema for {@link generateCliffGeometry}. */
export const GenerateCliffGeometryOptionsSchema = v.pipe(
	v.strictObject({
		/** Cliff edges to generate geometry for. */
		edges: v.pipe(v.array(CliffEdgeSchema), v.readonly()),
		/** Size of one tile in world units. */
		tileWorldSize: v.number(),
		/** Height of one tile level in world units. */
		tileWorldHeight: v.number(),
		/** UV rectangle for the wall texture. */
		wallUV: TileUVSchema,
		/** Starting vertex index (for merging). */
		indexOffset: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link generateCliffGeometry}. */
export type GenerateCliffGeometryOptions = v.InferOutput<typeof GenerateCliffGeometryOptionsSchema>;

// =============================================================================
// Cardinal Offsets
// =============================================================================

/** Cardinal neighbor offsets: [dx, dz, direction]. */
const CARDINAL_OFFSETS: ReadonlyArray<readonly [Num, Num, WallDirection]> = [
	[0, -1, 'north'],
	[1, 0, 'east'],
	[0, 1, 'south'],
	[-1, 0, 'west'],
];

// =============================================================================
// detectCliffEdges
// =============================================================================

/**
 * Detects cliff edges in a region of the height map.
 *
 * For each tile in the region, checks 4 cardinal neighbors. If a neighbor
 * has a lower height (or is out-of-bounds, treated as height 0), a cliff
 * edge is emitted on that side.
 *
 * @param options - Detection options with height map and region bounds
 * @returns Result containing array of detected cliff edges
 *
 * @example
 * ```typescript
 * const result = detectCliffEdges({
 *   heightMap: [0, 0, 0, 0, 1, 0, 0, 0, 0],
 *   mapWidth: 3, mapHeight: 3,
 *   startX: 0, startZ: 0, endX: 3, endZ: 3,
 * });
 * if (result.ok) result.data; // CliffEdge[]
 * ```
 */
export function detectCliffEdges(options: DetectCliffEdgesOptions): Result<readonly CliffEdge[]> {
	const { heightMap, mapWidth, mapHeight, startX, startZ, endX, endZ } = options;

	const edges: CliffEdge[] = [];

	for (let z: Num = startZ; z < endZ; z++) {
		for (let x: Num = startX; x < endX; x++) {
			const tileHeight: Num = heightMap[z * mapWidth + x] ?? 0;
			if (tileHeight === 0) continue;

			for (const [dx, dz, direction] of CARDINAL_OFFSETS) {
				const nx: Num = x + dx;
				const nz: Num = z + dz;

				let neighborHeight: Num = 0;
				if (nx >= 0 && nx < mapWidth && nz >= 0 && nz < mapHeight) {
					neighborHeight = heightMap[nz * mapWidth + nx] ?? 0;
				}

				if (tileHeight > neighborHeight) {
					edges.push({
						x,
						z,
						direction,
						topHeight: tileHeight,
						bottomHeight: neighborHeight,
					});
				}
			}
		}
	}

	return okUnchecked(edges);
}

// =============================================================================
// generateCliffGeometry
// =============================================================================

/**
 * Generates merged vertex data for an array of cliff edges.
 *
 * Each edge becomes a vertical wall face using {@link createWallFaceGeometry}.
 * The wall spans from `bottomHeight * tileWorldHeight` to
 * `topHeight * tileWorldHeight` in world Y.
 *
 * @param options - Geometry generation options
 * @returns Result containing merged vertex data for all cliff faces
 *
 * @example
 * ```typescript
 * const result = generateCliffGeometry({
 *   edges: [{ x: 1, z: 1, direction: 'south', topHeight: 2, bottomHeight: 0 }],
 *   tileWorldSize: 1, tileWorldHeight: 0.5,
 *   wallUV: { u0: 0, v0: 0, u1: 1, v1: 1 }, indexOffset: 0,
 * });
 * ```
 */
export function generateCliffGeometry(
	options: GenerateCliffGeometryOptions,
): BabylonResult<TileVertexData> {
	const { edges, tileWorldSize, tileWorldHeight, wallUV, indexOffset } = options;

	if (edges.length === 0) {
		return okShallow({
			positions: new Float32Array(0),
			normals: new Float32Array(0),
			uvs: new Float32Array(0),
			indices: new Uint32Array(0),
			vertexCount: 0,
		});
	}

	const wallParts: TileVertexData[] = [];
	let currentOffset: Num = 0;

	for (const edge of edges) {
		const topY: Num = edge.topHeight * tileWorldHeight;
		const bottomY: Num = edge.bottomHeight * tileWorldHeight;

		const wallResult: BabylonResult<TileVertexData> = createWallFaceGeometry({
			gridX: edge.x,
			gridZ: edge.z,
			topY,
			bottomY,
			direction: edge.direction,
			tileWorldSize,
			uv: wallUV,
			indexOffset: currentOffset,
		});

		if (!wallResult.ok) return wallResult;
		wallParts.push(wallResult.data);
		currentOffset += wallResult.data.vertexCount;
	}

	const merged: BabylonResult<TileVertexData> = mergeTileVertexData(wallParts);
	if (!merged.ok) return merged;

	if (indexOffset > 0) {
		const { indices } = merged.data;
		for (let i: Num = 0; i < indices.length; i++) {
			indices[i] = (indices[i] ?? 0) + indexOffset;
		}
	}

	return merged;
}

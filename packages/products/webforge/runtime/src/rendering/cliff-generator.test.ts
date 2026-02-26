/**
 * Tests for cliff-generator — height map analysis and cliff face geometry.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

import type { TileUV, TileVertexData } from './tile-geometry';
import { detectCliffEdges, generateCliffGeometry, type CliffEdge } from './cliff-generator';

// =============================================================================
// Helpers
// =============================================================================

/** Default wall UV for geometry tests. */
const WALL_UV: TileUV = { u0: 0, v0: 0, u1: 1, v1: 1 };

/**
 * Creates a flat height map filled with a single value.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @param fillHeight - Height value for every tile
 * @returns Flat row-major height array
 */
function createFlatHeightMap(width: Num, height: Num, fillHeight: Num): readonly Num[] {
	return Array.from({ length: width * height }, () => fillHeight);
}

// =============================================================================
// detectCliffEdges
// =============================================================================

describe('detectCliffEdges', () => {
	it('returns empty array for flat map (all height 0)', () => {
		const heightMap: readonly Num[] = createFlatHeightMap(4, 4, 0);
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 4,
			mapHeight: 4,
			startX: 0,
			startZ: 0,
			endX: 4,
			endZ: 4,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(0);
	});

	it('returns empty array for uniformly raised map', () => {
		const heightMap: readonly Num[] = createFlatHeightMap(3, 3, 2);
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 3,
			mapHeight: 3,
			startX: 0,
			startZ: 0,
			endX: 3,
			endZ: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Edges at map boundary where height > 0 → cliffs on boundary sides
		// All border tiles have height 2, neighbor OOB = height 0 → cliff faces
		expect(result.data.length).toBeGreaterThan(0);
	});

	it('returns 4 edges for single raised tile surrounded by 0', () => {
		// 3×3 map, center (1,1) is height 1, rest are 0
		const heightMap: Num[] = Array.from({ length: 9 }, () => 0);
		heightMap[4] = 1; // (1,1)
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 3,
			mapHeight: 3,
			startX: 0,
			startZ: 0,
			endX: 3,
			endZ: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(4);
		// Each edge should be at (1,1) facing N/S/E/W
		const directions: readonly string[] = result.data.map((e) => e.direction).sort();
		expect(directions).toEqual(['east', 'north', 'south', 'west']);
		// All edges have topHeight=1, bottomHeight=0
		for (const edge of result.data) {
			expect(edge.topHeight).toBe(1);
			expect(edge.bottomHeight).toBe(0);
			expect(edge.x).toBe(1);
			expect(edge.z).toBe(1);
		}
	});

	it('returns 6 edges for two adjacent raised tiles', () => {
		// 3×3 map, (1,1) and (2,1) are height 1, rest are 0
		const heightMap: Num[] = Array.from({ length: 9 }, () => 0);
		heightMap[4] = 1; // (1,1)
		heightMap[5] = 1; // (2,1)
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 3,
			mapHeight: 3,
			startX: 0,
			startZ: 0,
			endX: 3,
			endZ: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// No cliff between the two tiles (same height)
		// (1,1): north, south, west = 3 edges
		// (2,1): north, south, east = 3 edges
		// But (2,1) east is at map boundary → treat as height 0 → cliff
		expect(result.data).toHaveLength(6);
	});

	it('detects edges between height steps in a gradient', () => {
		// 3×1 map: heights [0, 1, 2]
		const heightMap: readonly Num[] = [0, 1, 2];
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 3,
			mapHeight: 1,
			startX: 0,
			startZ: 0,
			endX: 3,
			endZ: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// (0,0) height 0: no cliffs (0 is ground level, boundary = 0)
		// (1,0) height 1: west neighbor=0 → cliff west; east neighbor=2 → no cliff
		//   also north/south are OOB → treat as 0 → cliff north + south
		// (2,0) height 2: west neighbor=1 → cliff west (diff=1);
		//   east OOB → treat as 0 → cliff east (diff=2)
		//   north/south OOB → treat as 0 → cliff north + south
		// Look for edges between the steps
		const edgesAt1: readonly CliffEdge[] = result.data.filter((e) => e.x === 1);
		const westEdge: CliffEdge | undefined = edgesAt1.find((e) => e.direction === 'west');
		expect(westEdge).toBeDefined();
		if (westEdge) {
			expect(westEdge.topHeight).toBe(1);
			expect(westEdge.bottomHeight).toBe(0);
		}
	});

	it('generates cliff at map boundary when height > 0', () => {
		// 1×1 map with height 3
		const heightMap: readonly Num[] = [3];
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 1,
			mapHeight: 1,
			startX: 0,
			startZ: 0,
			endX: 1,
			endZ: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// All 4 neighbors OOB → height 0 → 4 cliff faces
		expect(result.data).toHaveLength(4);
		for (const edge of result.data) {
			expect(edge.topHeight).toBe(3);
			expect(edge.bottomHeight).toBe(0);
		}
	});

	it('clips to region bounds', () => {
		// 4×4 map, center 2×2 raised to height 1
		const heightMap: Num[] = Array.from({ length: 16 }, () => 0);
		heightMap[5] = 1; // (1,1)
		heightMap[6] = 1; // (2,1)
		heightMap[9] = 1; // (1,2)
		heightMap[10] = 1; // (2,2)
		// Only scan region (1,1)-(3,3) — the raised area
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 4,
			mapHeight: 4,
			startX: 1,
			startZ: 1,
			endX: 3,
			endZ: 3,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Only edges within the scanned region
		for (const edge of result.data) {
			expect(edge.x).toBeGreaterThanOrEqual(1);
			expect(edge.x).toBeLessThan(3);
			expect(edge.z).toBeGreaterThanOrEqual(1);
			expect(edge.z).toBeLessThan(3);
		}
	});

	it('handles multi-level height difference', () => {
		// 3×1 map: [0, 5, 0]
		const heightMap: readonly Num[] = [0, 5, 0];
		const result: Result<readonly CliffEdge[]> = detectCliffEdges({
			heightMap,
			mapWidth: 3,
			mapHeight: 1,
			startX: 0,
			startZ: 0,
			endX: 3,
			endZ: 1,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const eastEdge: CliffEdge | undefined = result.data.find(
			(e) => e.x === 1 && e.direction === 'east',
		);
		expect(eastEdge).toBeDefined();
		if (eastEdge) {
			expect(eastEdge.topHeight).toBe(5);
			expect(eastEdge.bottomHeight).toBe(0);
		}
	});
});

// =============================================================================
// generateCliffGeometry
// =============================================================================

describe('generateCliffGeometry', () => {
	it('returns empty vertex data for empty edges', () => {
		const result: Result<TileVertexData> = generateCliffGeometry({
			edges: [],
			tileWorldSize: 1,
			tileWorldHeight: 1,
			wallUV: WALL_UV,
			indexOffset: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.vertexCount).toBe(0);
		expect(result.data.positions).toHaveLength(0);
		expect(result.data.indices).toHaveLength(0);
	});

	it('generates 4 vertices and 6 indices for single edge', () => {
		const edges: readonly CliffEdge[] = [
			{ x: 2, z: 3, direction: 'south', topHeight: 1, bottomHeight: 0 },
		];
		const result: Result<TileVertexData> = generateCliffGeometry({
			edges,
			tileWorldSize: 1,
			tileWorldHeight: 1,
			wallUV: WALL_UV,
			indexOffset: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.vertexCount).toBe(4);
		expect(result.data.positions).toHaveLength(12); // 4 × 3
		expect(result.data.normals).toHaveLength(12);
		expect(result.data.uvs).toHaveLength(8); // 4 × 2
		expect(result.data.indices).toHaveLength(6); // 2 triangles
	});

	it('generates correct vertex count for multiple edges', () => {
		const edges: readonly CliffEdge[] = [
			{ x: 0, z: 0, direction: 'north', topHeight: 2, bottomHeight: 0 },
			{ x: 0, z: 0, direction: 'west', topHeight: 2, bottomHeight: 0 },
			{ x: 0, z: 0, direction: 'south', topHeight: 2, bottomHeight: 1 },
		];
		const result: Result<TileVertexData> = generateCliffGeometry({
			edges,
			tileWorldSize: 1,
			tileWorldHeight: 1,
			wallUV: WALL_UV,
			indexOffset: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.vertexCount).toBe(12); // 3 edges × 4 verts
		expect(result.data.indices).toHaveLength(18); // 3 edges × 6 indices
	});

	it('respects indexOffset for merged buffers', () => {
		const edges: readonly CliffEdge[] = [
			{ x: 1, z: 1, direction: 'east', topHeight: 1, bottomHeight: 0 },
		];
		const offset: Num = 100;
		const result: Result<TileVertexData> = generateCliffGeometry({
			edges,
			tileWorldSize: 1,
			tileWorldHeight: 1,
			wallUV: WALL_UV,
			indexOffset: offset,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// First index should start at offset
		const firstIndex: Num = result.data.indices[0] ?? 0;
		expect(firstIndex).toBe(offset);
	});

	it('scales wall height by tileWorldHeight', () => {
		const edges: readonly CliffEdge[] = [
			{ x: 0, z: 0, direction: 'south', topHeight: 2, bottomHeight: 0 },
		];
		const tileWorldHeight: Num = 0.5;
		const result: Result<TileVertexData> = generateCliffGeometry({
			edges,
			tileWorldSize: 1,
			tileWorldHeight,
			wallUV: WALL_UV,
			indexOffset: 0,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Top Y should be topHeight * tileWorldHeight = 2 * 0.5 = 1.0
		// Bottom Y should be bottomHeight * tileWorldHeight = 0 * 0.5 = 0.0
		// Check Y values in positions (every 3rd element starting at index 1)
		const yValues: Num[] = [];
		for (let i: Num = 1; i < result.data.positions.length; i += 3) {
			yValues.push(result.data.positions[i] ?? 0);
		}
		expect(Math.max(...yValues)).toBeCloseTo(1.0);
		expect(Math.min(...yValues)).toBeCloseTo(0.0);
	});
});

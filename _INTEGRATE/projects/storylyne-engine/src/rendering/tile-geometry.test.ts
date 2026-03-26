/**
 * Tile geometry tests.
 *
 * Logic tests for flat tile quads, wall face quads, and vertex data merging.
 * All tests are pure math — no Babylon.js dependency.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import type { Num } from '@/schemas/common';

import type { BabylonResult } from '../core/babylon-result';

import {
  LAYER_Y_OFFSETS,
  createFlatTileGeometry,
  createWallFaceGeometry,
  mergeTileVertexData,
  type TileUV,
  type TileVertexData,
} from './tile-geometry';

// =============================================================================
// Helpers
// =============================================================================

/** Unit UV covering the full texture. */
const FULL_UV: TileUV = { u0: 0, v0: 0, u1: 1, v1: 1 };

/** Quarter UV for tile index 0 in a 2×2 grid. */
const QUARTER_UV: TileUV = { u0: 0, v0: 0.5, u1: 0.5, v1: 1 };

// =============================================================================
// createFlatTileGeometry
// =============================================================================

describe('createFlatTileGeometry', () => {
  test('grid (0,0) height 0 produces correct vertex positions', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const p: Float32Array = result.data.positions;
    expect(p).toHaveLength(12);
    // Vertex 0: (0, 0, 0)
    expect(p[0]).toBe(0);
    expect(p[1]).toBe(0);
    expect(p[2]).toBe(0);
    // Vertex 1: (1, 0, 0)
    expect(p[3]).toBe(1);
    expect(p[4]).toBe(0);
    expect(p[5]).toBe(0);
    // Vertex 2: (1, 0, 1)
    expect(p[6]).toBe(1);
    expect(p[7]).toBe(0);
    expect(p[8]).toBe(1);
    // Vertex 3: (0, 0, 1)
    expect(p[9]).toBe(0);
    expect(p[10]).toBe(0);
    expect(p[11]).toBe(1);
  });

  test('grid (3,7) height 2 produces offset world positions', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 3,
      gridZ: 7,
      heightY: 2,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const p: Float32Array = result.data.positions;
    // Vertex 0: (3, 2, 7)
    expect(p[0]).toBe(3);
    expect(p[1]).toBe(2);
    expect(p[2]).toBe(7);
    // Vertex 2: (4, 2, 8)
    expect(p[6]).toBe(4);
    expect(p[7]).toBe(2);
    expect(p[8]).toBe(8);
  });

  test('tileWorldSize scales positions correctly', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 1,
      gridZ: 1,
      heightY: 0,
      tileWorldSize: 48,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const p: Float32Array = result.data.positions;
    // Vertex 0: (48, 0, 48)
    expect(p[0]).toBe(48);
    expect(p[2]).toBe(48);
    // Vertex 2: (96, 0, 96)
    expect(p[6]).toBe(96);
    expect(p[8]).toBe(96);
  });

  test('UV coordinates match input TileUV exactly', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: QUARTER_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const uv: Float32Array = result.data.uvs;
    expect(uv).toHaveLength(8);
    // Bottom-left
    expect(uv[0]).toBe(0);
    expect(uv[1]).toBe(0.5);
    // Bottom-right
    expect(uv[2]).toBe(0.5);
    expect(uv[3]).toBe(0.5);
    // Top-right
    expect(uv[4]).toBe(0.5);
    expect(uv[5]).toBe(1);
    // Top-left
    expect(uv[6]).toBe(0);
    expect(uv[7]).toBe(1);
  });

  test('all normals point up (0, 1, 0)', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const n: Float32Array = result.data.normals;
    expect(n).toHaveLength(12);
    for (let i = 0; i < 4; i++) {
      expect(n[i * 3]).toBe(0);
      expect(n[i * 3 + 1]).toBe(1);
      expect(n[i * 3 + 2]).toBe(0);
    }
  });

  test('produces 6 indices forming 2 CCW triangles', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const idx: Uint32Array = result.data.indices;
    expect(idx).toHaveLength(6);
    expect([...idx]).toEqual([0, 1, 2, 0, 2, 3]);
  });

  test('indexOffset shifts all indices', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 8,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    expect([...result.data.indices]).toEqual([8, 9, 10, 8, 10, 11]);
  });

  test('vertexCount is 4', () => {
    const result: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.vertexCount).toBe(4);
  });
});

// =============================================================================
// createWallFaceGeometry
// =============================================================================

describe('createWallFaceGeometry', () => {
  test('south face produces correct positions', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 2,
      gridZ: 3,
      topY: 2,
      bottomY: 0,
      direction: 'south',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const p: Float32Array = result.data.positions;
    // South face at z+1=4
    // Vertex 0: (2, 0, 4) — bottom-left
    expect(p[0]).toBe(2);
    expect(p[1]).toBe(0);
    expect(p[2]).toBe(4);
    // Vertex 2: (3, 2, 4) — top-right
    expect(p[6]).toBe(3);
    expect(p[7]).toBe(2);
    expect(p[8]).toBe(4);
  });

  test('north face normal points toward -Z', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 0,
      direction: 'north',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const n: Float32Array = result.data.normals;
    for (let i = 0; i < 4; i++) {
      expect(n[i * 3]).toBe(0);
      expect(n[i * 3 + 1]).toBe(0);
      expect(n[i * 3 + 2]).toBe(-1);
    }
  });

  test('south face normal points toward +Z', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 0,
      direction: 'south',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const n: Float32Array = result.data.normals;
    for (let i = 0; i < 4; i++) {
      expect(n[i * 3]).toBe(0);
      expect(n[i * 3 + 1]).toBe(0);
      expect(n[i * 3 + 2]).toBe(1);
    }
  });

  test('east face normal points toward +X', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 0,
      direction: 'east',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const n: Float32Array = result.data.normals;
    for (let i = 0; i < 4; i++) {
      expect(n[i * 3]).toBe(1);
      expect(n[i * 3 + 1]).toBe(0);
      expect(n[i * 3 + 2]).toBe(0);
    }
  });

  test('west face normal points toward -X', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 0,
      direction: 'west',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const n: Float32Array = result.data.normals;
    for (let i = 0; i < 4; i++) {
      expect(n[i * 3]).toBe(-1);
      expect(n[i * 3 + 1]).toBe(0);
      expect(n[i * 3 + 2]).toBe(0);
    }
  });

  test('rejects topY equal to bottomY', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 1,
      direction: 'south',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects topY less than bottomY', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 0,
      bottomY: 2,
      direction: 'south',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeFalsy();
  });

  test('vertexCount is 4', () => {
    const result: BabylonResult<TileVertexData> = createWallFaceGeometry({
      gridX: 0,
      gridZ: 0,
      topY: 1,
      bottomY: 0,
      direction: 'north',
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.vertexCount).toBe(4);
  });
});

// =============================================================================
// mergeTileVertexData
// =============================================================================

describe('mergeTileVertexData', () => {
  test('empty array produces empty buffers', () => {
    const result: BabylonResult<TileVertexData> = mergeTileVertexData([]);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.vertexCount).toBe(0);
    expect(result.data.positions).toHaveLength(0);
    expect(result.data.normals).toHaveLength(0);
    expect(result.data.uvs).toHaveLength(0);
    expect(result.data.indices).toHaveLength(0);
  });

  test('single tile passes through unchanged', () => {
    const tileResult: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    expect(tileResult.ok).toBeTruthy();
    if (!tileResult.ok) return;

    const result: BabylonResult<TileVertexData> = mergeTileVertexData([tileResult.data]);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.vertexCount).toBe(4);
    expect(result.data.positions).toHaveLength(12);
    expect(result.data.indices).toHaveLength(6);
  });

  test('two flat tiles merge to 8 vertices and 12 indices', () => {
    const tile1: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    const tile2: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 1,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 4,
    });
    expect(tile1.ok).toBeTruthy();
    expect(tile2.ok).toBeTruthy();
    if (!tile1.ok || !tile2.ok) return;

    const result: BabylonResult<TileVertexData> = mergeTileVertexData([tile1.data, tile2.data]);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.vertexCount).toBe(8);
    expect(result.data.positions).toHaveLength(24);
    expect(result.data.indices).toHaveLength(12);
  });

  test('indices correctly rebased after merge', () => {
    const tile1: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 0,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 0,
    });
    const tile2: BabylonResult<TileVertexData> = createFlatTileGeometry({
      gridX: 1,
      gridZ: 0,
      heightY: 0,
      tileWorldSize: 1,
      uv: FULL_UV,
      indexOffset: 4,
    });
    expect(tile1.ok).toBeTruthy();
    expect(tile2.ok).toBeTruthy();
    if (!tile1.ok || !tile2.ok) return;

    const result: BabylonResult<TileVertexData> = mergeTileVertexData([tile1.data, tile2.data]);
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;

    const idx: Uint32Array = result.data.indices;
    // First tile: 0,1,2, 0,2,3
    expect(idx[0]).toBe(0);
    expect(idx[1]).toBe(1);
    expect(idx[2]).toBe(2);
    expect(idx[3]).toBe(0);
    expect(idx[4]).toBe(2);
    expect(idx[5]).toBe(3);
    // Second tile: 4,5,6, 4,6,7
    expect(idx[6]).toBe(4);
    expect(idx[7]).toBe(5);
    expect(idx[8]).toBe(6);
    expect(idx[9]).toBe(4);
    expect(idx[10]).toBe(6);
    expect(idx[11]).toBe(7);
  });
});

// =============================================================================
// LAYER_Y_OFFSETS
// =============================================================================

describe('LAYER_Y_OFFSETS', () => {
  test('has all 5 preset layer types', () => {
    expect(LAYER_Y_OFFSETS.ground).toBeDefined();
    expect(LAYER_Y_OFFSETS.ground_deco).toBeDefined();
    expect(LAYER_Y_OFFSETS.upper1).toBeDefined();
    expect(LAYER_Y_OFFSETS.upper2).toBeDefined();
    expect(LAYER_Y_OFFSETS.shadow).toBeDefined();
  });

  test('ground is 0', () => {
    expect(LAYER_Y_OFFSETS.ground).toBe(0);
  });

  test('ground_deco is above ground', () => {
    const ground: Num = LAYER_Y_OFFSETS.ground ?? 0;
    const groundDeco: Num = LAYER_Y_OFFSETS.ground_deco ?? 0;
    expect(groundDeco).toBeGreaterThan(ground);
  });

  test('upper layers are above ground_deco', () => {
    const groundDeco: Num = LAYER_Y_OFFSETS.ground_deco ?? 0;
    const upper1: Num = LAYER_Y_OFFSETS.upper1 ?? 0;
    const upper2: Num = LAYER_Y_OFFSETS.upper2 ?? 0;
    expect(upper1).toBeGreaterThan(groundDeco);
    expect(upper2).toBeGreaterThan(upper1);
  });

  test('shadow is below ground', () => {
    const ground: Num = LAYER_Y_OFFSETS.ground ?? 0;
    const shadow: Num = LAYER_Y_OFFSETS.shadow ?? 0;
    expect(shadow).toBeLessThan(ground);
  });

  test('returns undefined for unknown layer types', () => {
    expect(LAYER_Y_OFFSETS.customLayer).toBeUndefined();
  });
});

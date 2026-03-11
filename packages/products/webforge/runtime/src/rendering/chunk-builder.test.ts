/**
 * Tests for chunk-builder — merged mesh construction per 16x16 chunk.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import type { MapData, TileLayer, TilesetConfig } from '../schemas/map-data';
import { computeTileUVs, type LoadedTileset } from './tileset-loader';
import type { TileUV } from './tile-geometry';
import {
  buildChunk,
  buildCliffChunk,
  rebuildChunk,
  type ChunkBuildContext,
  type ChunkMesh,
} from './chunk-builder';

// =============================================================================
// Helpers
// =============================================================================

let instance: BabylonEngineInstance | null = null;

afterEach(() => {
  if (instance) {
    disposeEngine(instance);
    instance = null;
  }
});

/**
 * Creates a NullEngine scene for testing.
 *
 * @returns The Babylon.js scene
 */
function setupEngine(): BABYLON.Scene {
  const result: BabylonResult<BabylonEngineInstance> = createTestEngine();
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Engine creation failed');
  instance = result.data;
  return instance.scene;
}

/**
 * Creates a minimal tileset config.
 *
 * @param name - Tileset name
 * @param firstGid - First global tile ID
 * @param columns - Number of columns
 * @param rows - Number of rows
 * @returns TilesetConfig
 */
function makeConfig(name: string, firstGid: Num, columns: Num, rows: Num): TilesetConfig {
  return {
    name,
    imagePath: `${name}.png`,
    tileWidth: 48,
    tileHeight: 48,
    columns,
    rows,
    firstGid,
    autotileType: 'none',
    animationFrames: 1,
    animationSpeed: 4,
    tileProperties: {},
  };
}

/** Default tile layer properties for test fixtures. */
const TILE_LAYER_DEFAULTS: Omit<TileLayer, 'name' | 'type' | 'data'> = {
  kind: 'tile',
  visible: true,
  opacity: 1,
  tintColor: { r: 1, g: 1, b: 1, a: 1 },
  brightness: 0,
  saturation: 1,
  contrast: 1,
  offsetX: 0,
  offsetY: 0,
  parallaxFactorX: 1,
  parallaxFactorY: 1,
  parallaxOriginX: 0,
  parallaxOriginY: 0,
  scaleX: 1,
  scaleY: 1,
  renderOrder: 0,
  castShadows: false,
  receiveShadows: true,
  depthWrite: true,
  maskLayer: '',
  cullingPadding: 0,
  ySortEnabled: false,
  blendMode: 'alpha',
  locked: false,
  collapsed: false,
  color: '',
};

/**
 * Creates a complete TileLayer with all defaults filled.
 *
 * @param name - Layer name
 * @param type - Layer type
 * @param data - Tile data array
 * @param overrides - Optional overrides for defaults
 * @returns Complete TileLayer
 */
function makeTileLayer(
  name: string,
  type: string,
  data: readonly number[],
  overrides?: Partial<TileLayer>,
): TileLayer {
  return { ...TILE_LAYER_DEFAULTS, name, type, data: [...data], ...overrides };
}

/**
 * Creates a LoadedTileset stub for testing.
 *
 * @param scene - The Babylon.js scene
 * @param config - Tileset configuration
 * @returns LoadedTileset
 */
function makeLoadedTileset(scene: BABYLON.Scene, config: TilesetConfig): LoadedTileset {
  const tex: BABYLON.Texture = new BABYLON.Texture(
    null,
    scene,
    true,
    undefined,
    BABYLON.Texture.NEAREST_SAMPLINGMODE,
  );
  const uvResult = computeTileUVs({
    columns: config.columns,
    rows: config.rows,
    tileWidth: config.tileWidth,
    tileHeight: config.tileHeight,
  });
  const uvLookup: readonly TileUV[] = uvResult.ok ? uvResult.data : [];
  return { config, texture: tex, uvLookup };
}

/**
 * Creates a ChunkBuildContext for testing.
 *
 * @param scene - The Babylon.js scene
 * @param mapData - Map data
 * @param tilesets - Loaded tilesets
 * @param chunkSize - Chunk size in tiles
 * @returns ChunkBuildContext
 */
function makeContext(
  scene: BABYLON.Scene,
  mapData: MapData,
  tilesets: readonly LoadedTileset[],
  chunkSize: Num,
): ChunkBuildContext {
  const materials: BABYLON.StandardMaterial[] = tilesets.map((ts) => {
    const mat: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(ts.config.name, scene);
    mat.diffuseTexture = ts.texture;
    return mat;
  });
  return {
    scene,
    mapData,
    loadedTilesets: tilesets,
    materials,
    tileWorldSize: 1,
    tileWorldHeight: 0.5,
    chunkSize,
  };
}

// =============================================================================
// buildChunk
// =============================================================================

describe('buildChunk', () => {
  it('creates mesh for 4x4 chunk with all tiles filled', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    // 4×4 map, all tile ID=1
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    expect(result.data.tileCount).toBe(16);
    expect(result.data.mesh).toBeInstanceOf(BABYLON.Mesh);
  });

  it('returns null for all empty tiles', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 0),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  it('counts only non-empty tiles', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    // 4×4 map, only 4 tiles filled
    const data: Num[] = Array.from({ length: 16 }, () => 0);
    data[0] = 1;
    data[5] = 1;
    data[10] = 1;
    data[15] = 1;
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [makeTileLayer('ground', 'ground', data)],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    expect(result.data.tileCount).toBe(4);
  });

  it('names mesh with chunk coordinates and layer name', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 2,
      chunkZ: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Chunk is out of bounds for a 4×4 map with chunkSize 4
    // (chunk 2,3 starts at x=8, z=12 which is beyond width=4)
    // So it should return null since all tiles are out of bounds
    expect(result.data).toBeNull();
  });

  it('creates named mesh for valid chunk position', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 8, 8);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    // 8×8 map → 2 chunks of 4 each
    const mapData: MapData = {
      width: 8,
      height: 8,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'upper1',
          'upper1',
          Array.from({ length: 64 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 1,
      chunkZ: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    expect(result.data.mesh.name).toBe('chunk-1-1-upper1');
  });
});

// =============================================================================
// buildCliffChunk
// =============================================================================

describe('buildCliffChunk', () => {
  it('creates cliff mesh when height differences exist', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const heightMap: Num[] = Array.from({ length: 16 }, () => 0);
    heightMap[5] = 2; // (1,1) raised
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
      heightMap,
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
      context: ctx,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    expect(result.data.mesh).toBeInstanceOf(BABYLON.Mesh);
  });

  it('returns null for flat terrain (no height differences)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
      heightMap: Array.from({ length: 16 }, () => 0),
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
      context: ctx,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  it('returns null when no heightMap provided', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildCliffChunk({
      context: ctx,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });
});

// =============================================================================
// rebuildChunk
// =============================================================================

describe('rebuildChunk', () => {
  it('updates existing mesh vertex data in-place', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    // Build initial chunk
    const first: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data).not.toBeNull();
    if (!first.data) return;
    const oldMesh: BABYLON.Mesh = first.data.mesh;

    // Rebuild with existing mesh — should reuse same instance
    const result: BabylonResult<ChunkMesh | null> = rebuildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
      existingMesh: oldMesh,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    // Mesh should NOT be disposed — it was updated in-place
    expect(oldMesh.isDisposed()).toBe(false);
    // Should be the same mesh instance
    expect(result.data.mesh).toBe(oldMesh);
  });

  it('returns null for hidden layer (visible: false)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
          { visible: false },
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  it('applies layer opacity to mesh.visibility', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
          { opacity: 0.5 },
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = buildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
    if (!result.data) return;
    expect(result.data.mesh.visibility).toBe(0.5);
  });

  it('works with null existing mesh', () => {
    const scene: BABYLON.Scene = setupEngine();
    const config: TilesetConfig = makeConfig('terrain', 1, 4, 4);
    const tilesets: LoadedTileset[] = [makeLoadedTileset(scene, config)];
    const mapData: MapData = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [config],
      layers: [
        makeTileLayer(
          'ground',
          'ground',
          Array.from({ length: 16 }, () => 1),
        ),
      ],
    };
    const ctx: ChunkBuildContext = makeContext(scene, mapData, tilesets, 4);

    const result: BabylonResult<ChunkMesh | null> = rebuildChunk({
      context: ctx,
      layerIndex: 0,
      chunkX: 0,
      chunkZ: 0,
      existingMesh: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toBeNull();
  });
});

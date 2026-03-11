/**
 * Tests for tilemap-renderer — end-to-end MapData → scene pipeline.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';
import {
  disposeTilemap,
  renderTilemap,
  setLayerOpacity,
  setLayerVisibility,
  updateTile,
  type RenderedTilemap,
} from './tilemap-renderer';

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
 * Creates a minimal valid MapData object.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @returns A valid MapData-shaped plain object
 */
function makeMinimalMapData(width: Num, height: Num): Record<string, unknown> {
  return {
    width,
    height,
    tileWidth: 48,
    tileHeight: 48,
    tilesets: [
      {
        name: 'terrain',
        imagePath: 'tilesets/terrain.png',
        tileWidth: 48,
        tileHeight: 48,
        columns: 4,
        rows: 4,
        firstGid: 1,
        autotileType: 'none',
        animationFrames: 1,
        animationSpeed: 4,
        tileProperties: {},
      },
    ],
    layers: [
      {
        name: 'ground',
        type: 'ground',
        data: Array.from({ length: width * height }, () => 1),
        visible: true,
        opacity: 1,
      },
    ],
  };
}

// =============================================================================
// renderTilemap
// =============================================================================

describe('renderTilemap', () => {
  it('creates GPU layers for tile layers', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers.length).toBe(1);
    expect(result.data.chunks.length).toBe(0);
    expect(result.data.tilesets.length).toBe(1);
    expect(result.data.materials.length).toBe(1);
  });

  it('creates one GPU layer per tile layer', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16 }, () => 1),
          visible: true,
          opacity: 1,
        },
        {
          name: 'decoration',
          type: 'decoration',
          data: Array.from({ length: 16 }, () => 0),
          visible: true,
          opacity: 1,
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers.length).toBe(2);
  });

  it('GPU layer stores correct map dimensions', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(8, 6);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const gpuLayer = result.data.gpuLayers[0]!;
    expect(gpuLayer.mapWidth).toBe(8);
    expect(gpuLayer.mapHeight).toBe(6);
  });

  it('GPU layer mesh has renderingGroupId 2', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers[0]!.mesh.renderingGroupId).toBe(2);
  });

  it('returns error for invalid MapData (missing width)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      height: 4,
      tilesets: [],
      layers: [],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(false);
  });

  it('returns error for layer data length mismatch', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      width: 4,
      height: 4,
      tileWidth: 48,
      tileHeight: 48,
      tilesets: [
        {
          name: 'terrain',
          imagePath: 'terrain.png',
          tileWidth: 48,
          tileHeight: 48,
          columns: 4,
          rows: 4,
          firstGid: 1,
          autotileType: 'none',
          animationFrames: 1,
          animationSpeed: 4,
          tileProperties: {},
        },
      ],
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: [1, 2, 3], // Wrong length — should be 16
          visible: true,
          opacity: 1,
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(false);
  });

  it('generates cliff chunks when heightMap is provided', () => {
    const scene: BABYLON.Scene = setupEngine();
    const heightMap: Num[] = Array.from({ length: 16 }, () => 0);
    heightMap[5] = 2; // (1,1) raised
    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      heightMap,
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cliffChunks.length).toBeGreaterThan(0);
  });

  it('returns error for heightMap length mismatch', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      heightMap: [0, 0, 0], // Wrong length — should be 16
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(false);
  });

  it('creates GPU layers for larger maps', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(8, 8);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers.length).toBe(1);
    expect(result.data.gpuLayers[0]!.mapWidth).toBe(8);
    expect(result.data.gpuLayers[0]!.mapHeight).toBe(8);
  });

  it('defaults postProcessing to null when not configured', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.postProcessing).toBeNull();
  });

  it('defaults lighting to null when not configured', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lighting).toBeNull();
  });

  it('creates lighting instance when lighting config provided', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      lighting: {
        lights: [
          {
            id: 'ambient',
            type: 'hemispheric',
            intensity: 0.6,
            direction: { x: 0, y: 1, z: 0 },
          },
        ],
      },
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lighting).not.toBeNull();
    expect(result.data.lighting?.lights).toHaveLength(1);
  });

  it('creates post-processing pipeline when configured', () => {
    const scene: BABYLON.Scene = setupEngine();
    // eslint-disable-next-line no-new -- Babylon.js auto-registers camera with scene
    new BABYLON.FreeCamera('test-camera', new BABYLON.Vector3(0, 0, 0), scene);

    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      postProcessing: { preset: 'hd2d' },
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.postProcessing).not.toBeNull();
  });
});

// =============================================================================
// disposeTilemap
// =============================================================================

describe('disposeTilemap', () => {
  it('disposes lighting along with other resources', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(4, 4),
      lighting: {
        lights: [
          {
            id: 'ambient',
            type: 'hemispheric',
            intensity: 0.6,
            direction: { x: 0, y: 1, z: 0 },
          },
        ],
      },
    };

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    // Verify lighting was created
    expect(renderResult.data.lighting).not.toBeNull();

    const result = disposeTilemap({ tilemap: renderResult.data });
    expect(result.ok).toBe(true);
  });

  it('disposes GPU layer meshes', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const tilemap: RenderedTilemap = renderResult.data;
    const gpuMeshes: BABYLON.Mesh[] = tilemap.gpuLayers.map((l) => l.mesh);

    const result = disposeTilemap({ tilemap });
    expect(result.ok).toBe(true);

    // All GPU layer meshes should be disposed
    for (const mesh of gpuMeshes) {
      expect(mesh.isDisposed()).toBe(true);
    }
  });
});

// =============================================================================
// updateTile
// =============================================================================

describe('updateTile', () => {
  it('updates GPU data texture when tile changes', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const gpuLayer = renderResult.data.gpuLayers[0]!;
    // Initial tile at (0,0): global ID=1, atlas local=1 (firstGid=1 → 1-1+1=1)
    expect(gpuLayer.layerData[0]).toBe(1);

    const result: BabylonResult<RenderedTilemap> = updateTile({
      tilemap: renderResult.data,
      layerIndex: 0,
      x: 0,
      z: 0,
      newTileId: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // GPU data texture should be updated (global 2 → atlas local 2)
    expect(gpuLayer.layerData[0]).toBe(2);
  });

  it('clears GPU tile when set to 0', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result: BabylonResult<RenderedTilemap> = updateTile({
      tilemap: renderResult.data,
      layerIndex: 0,
      x: 0,
      z: 0,
      newTileId: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const gpuLayer = renderResult.data.gpuLayers[0]!;
    expect(gpuLayer.layerData[0]).toBe(0); // R = 0 (empty)
    expect(gpuLayer.layerData[1]).toBe(0); // G = 0 (no flags for empty)
  });

  it('updates CPU-side mapData for consistency', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result: BabylonResult<RenderedTilemap> = updateTile({
      tilemap: renderResult.data,
      layerIndex: 0,
      x: 1,
      z: 0,
      newTileId: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // oxlint-disable-next-line prefer-destructuring -- nested chain readability
    const updatedLayer = result.data.mapData.layers[0];
    if (updatedLayer?.kind === 'tile') {
      expect(updatedLayer.data[1]).toBe(5);
    }
  });

  it('returns error for invalid layer index', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result: BabylonResult<RenderedTilemap> = updateTile({
      tilemap: renderResult.data,
      layerIndex: 99,
      x: 0,
      z: 0,
      newTileId: 2,
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// setLayerVisibility + setLayerOpacity
// =============================================================================

describe('setLayerVisibility', () => {
  it('disables GPU layer mesh when hidden', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const gpuLayer = renderResult.data.gpuLayers[0]!;
    expect(gpuLayer.mesh.isEnabled()).toBe(true);

    const result = setLayerVisibility({
      tilemap: renderResult.data,
      layerIndex: 0,
      visible: false,
    });
    expect(result.ok).toBe(true);
    expect(gpuLayer.mesh.isEnabled()).toBe(false);
  });

  it('re-enables GPU layer mesh when shown', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    setLayerVisibility({
      tilemap: renderResult.data,
      layerIndex: 0,
      visible: false,
    });

    setLayerVisibility({
      tilemap: renderResult.data,
      layerIndex: 0,
      visible: true,
    });

    const gpuLayer = renderResult.data.gpuLayers[0]!;
    expect(gpuLayer.mesh.isEnabled()).toBe(true);
  });

  it('returns ok for non-existent layer index (no-op)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result = setLayerVisibility({
      tilemap: renderResult.data,
      layerIndex: 99,
      visible: false,
    });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// Streaming integration
// =============================================================================

describe('streaming integration', () => {
  it('uses direct GPU layers for small maps (no streaming)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers.length).toBe(1);
    expect(result.data.streamingManager).toBeNull();
  });

  it('uses streaming for maps exceeding 16384 width', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(16_385, 1),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16_385 }, () => 1),
          visible: true,
          opacity: 1,
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Streaming path: no direct GPU layers, streaming manager created
    expect(result.data.gpuLayers.length).toBe(0);
    expect(result.data.streamingManager).not.toBeNull();
  });

  it('uses streaming for maps exceeding 16384 height', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(1, 16_385),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16_385 }, () => 1),
          visible: true,
          opacity: 1,
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gpuLayers.length).toBe(0);
    expect(result.data.streamingManager).not.toBeNull();
  });

  it('disposes streaming manager on dispose', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(16_385, 1),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16_385 }, () => 1),
          visible: true,
          opacity: 1,
        },
      ],
    };

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    expect(renderResult.data.streamingManager).not.toBeNull();

    const result = disposeTilemap({ tilemap: renderResult.data });
    expect(result.ok).toBe(true);
  });

  it('updates CPU data for tile edits on streaming maps', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = {
      ...makeMinimalMapData(16_385, 1),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16_385 }, () => 1),
          visible: true,
          opacity: 1,
        },
      ],
    };

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result: BabylonResult<RenderedTilemap> = updateTile({
      tilemap: renderResult.data,
      layerIndex: 0,
      x: 0,
      z: 0,
      newTileId: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [updatedLayer] = result.data.mapData.layers;
    if (updatedLayer?.kind === 'tile') {
      expect(updatedLayer.data[0]).toBe(5);
    }
  });
});

describe('setLayerOpacity', () => {
  it('updates GPU layer plugin opacity', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const renderResult: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(renderResult.ok).toBe(true);
    if (!renderResult.ok) return;

    const result = setLayerOpacity({
      tilemap: renderResult.data,
      layerIndex: 0,
      opacity: 0.3,
    });
    expect(result.ok).toBe(true);

    const gpuLayer = renderResult.data.gpuLayers[0]!;
    expect(gpuLayer.plugin.layerOpacity).toBeCloseTo(0.3);
    expect(gpuLayer.mesh.visibility).toBeCloseTo(0.3);
  });
});

// =============================================================================
// Object layer integration
// =============================================================================

describe('renderTilemap — object layers', () => {
  it('creates object renderer when object layers exist', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: Record<string, unknown> = {
      ...makeMinimalMapData(4, 4),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16 }, () => 1),
        },
        {
          kind: 'object',
          name: 'npcs',
          objects: [
            { id: 'npc1', class: 'villager', x: 48, y: 96 },
            { id: 'npc2', class: 'guard', x: 144, y: 48 },
          ],
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.objectRenderer).not.toBeNull();
  });

  it('objectRenderer is null when no object layers exist', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: unknown = makeMinimalMapData(4, 4);

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.objectRenderer).toBeNull();
  });

  it('dispose cleans up object renderer', () => {
    const scene: BABYLON.Scene = setupEngine();
    const mapData: Record<string, unknown> = {
      ...makeMinimalMapData(4, 4),
      layers: [
        {
          name: 'ground',
          type: 'ground',
          data: Array.from({ length: 16 }, () => 1),
        },
        {
          kind: 'object',
          name: 'props',
          objects: [{ id: 'tree1', class: 'tree', x: 48, y: 48 }],
        },
      ],
    };

    const result: BabylonResult<RenderedTilemap> = renderTilemap({
      scene,
      mapDataInput: mapData,
      assetBasePath: '/assets/',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.objectRenderer).not.toBeNull();

    // Dispose should not throw
    disposeTilemap({ tilemap: result.data });
  });
});

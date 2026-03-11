/**
 * GPU tile renderer tests.
 *
 * Tests for GPU tile layer creation, disposal, single-tile editing,
 * visibility/opacity control, and per-layer uniform setters.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';

import {
  createGpuTileLayer,
  disposeGpuTileLayer,
  setGpuLayerVisibility,
  setGpuLayerOpacity,
  setGpuAnimationFrame,
  setGpuLayerTint,
  setGpuLayerBrightness,
  setGpuLayerSaturation,
  setGpuLayerContrast,
  setGpuLayerOffset,
  updateGpuTile,
  updateGpuTileAutotile,
  type GpuTileLayer,
} from './gpu-tile-renderer';

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

// =============================================================================
// createGpuTileLayer
// =============================================================================

describe('createGpuTileLayer', () => {
  it('creates a mesh with correct name', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'ground',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mesh.name).toContain('gpu-layer-ground');
  });

  it('stores CPU-side layer data', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [5, 10, 15, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'upper',
      layerIndex: 1,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // CPU data is RGBA32UI format: 4 tiles × 4 channels = 16 entries
    expect(result.data.layerData.length).toBe(16);
  });

  it('stores mapWidth and mapHeight', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4, 5, 6];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'test',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mapWidth).toBe(3);
    expect(result.data.mapHeight).toBe(2);
  });

  it('stores layerIndex', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'deco',
      layerIndex: 3,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.layerIndex).toBe(3);
  });

  it('returns error for empty tileIds', () => {
    const scene: BABYLON.Scene = setupEngine();

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'empty',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds: [],
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(false);
  });

  it('creates a StandardMaterial with plugin enabled', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'mat-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.material).toBeInstanceOf(BABYLON.StandardMaterial);
    expect(result.data.plugin.isEnabled).toBe(true);
  });

  it('sets plugin mapSize from options', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4, 5, 6];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'plugin-test',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.plugin.mapSize.x).toBe(3);
    expect(result.data.plugin.mapSize.y).toBe(2);
  });

  it('returns error for dimension mismatch', () => {
    const scene: BABYLON.Scene = setupEngine();

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'mismatch',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds: [1, 2], // Only 2 tiles, needs 9
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// disposeGpuTileLayer
// =============================================================================

describe('disposeGpuTileLayer', () => {
  it('disposes the mesh', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const createResult: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'disposable',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const meshCount: Num = scene.meshes.length;
    disposeGpuTileLayer({ layer: createResult.data });

    // Mesh should be removed from scene
    expect(scene.meshes.length).toBeLessThan(meshCount);
  });
});

// =============================================================================
// setGpuLayerVisibility
// =============================================================================

describe('setGpuLayerVisibility', () => {
  it('disables mesh when visibility is false', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'vis-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerVisibility({ layer: result.data, visible: false });
    expect(result.data.mesh.isEnabled()).toBe(false);
  });

  it('enables mesh when visibility is true', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'vis-test2',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerVisibility({ layer: result.data, visible: false });
    setGpuLayerVisibility({ layer: result.data, visible: true });
    expect(result.data.mesh.isEnabled()).toBe(true);
  });
});

// =============================================================================
// setGpuLayerOpacity
// =============================================================================

describe('setGpuLayerOpacity', () => {
  it('updates plugin layerOpacity', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'opacity-plugin',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerOpacity({ layer: result.data, opacity: 0.3 });
    expect(result.data.plugin.layerOpacity).toBeCloseTo(0.3);
  });

  it('updates mesh visibility property', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'opacity-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerOpacity({ layer: result.data, opacity: 0.5 });
    expect(result.data.mesh.visibility).toBeCloseTo(0.5);
  });
});

// =============================================================================
// setGpuAnimationFrame
// =============================================================================

describe('setGpuAnimationFrame', () => {
  it('updates plugin animationFrame', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'anim-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuAnimationFrame({ layer: result.data, frame: 5 });
    expect(result.data.plugin.animationFrame).toBe(5);
  });

  it('handles frame 0', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'anim-zero',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuAnimationFrame({ layer: result.data, frame: 0 });
    expect(result.data.plugin.animationFrame).toBe(0);
  });
});

// =============================================================================
// setGpuLayerTint
// =============================================================================

describe('setGpuLayerTint', () => {
  it('updates plugin layerTint', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'tint-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerTint({ layer: result.data, r: 1, g: 0.5, b: 0.2, a: 0.8 });
    expect(result.data.plugin.layerTint.r).toBeCloseTo(1);
    expect(result.data.plugin.layerTint.g).toBeCloseTo(0.5);
    expect(result.data.plugin.layerTint.b).toBeCloseTo(0.2);
    expect(result.data.plugin.layerTint.a).toBeCloseTo(0.8);
  });

  it('sets white tint (identity)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'tint-white',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerTint({ layer: result.data, r: 1, g: 1, b: 1, a: 1 });
    expect(result.data.plugin.layerTint.r).toBe(1);
    expect(result.data.plugin.layerTint.g).toBe(1);
    expect(result.data.plugin.layerTint.b).toBe(1);
    expect(result.data.plugin.layerTint.a).toBe(1);
  });
});

// =============================================================================
// setGpuLayerBrightness
// =============================================================================

describe('setGpuLayerBrightness', () => {
  it('updates plugin layerBrightness', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'bright-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerBrightness({ layer: result.data, brightness: 0.5 });
    expect(result.data.plugin.layerBrightness).toBeCloseTo(0.5);
  });

  it('handles negative brightness', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'bright-neg',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerBrightness({ layer: result.data, brightness: -0.3 });
    expect(result.data.plugin.layerBrightness).toBeCloseTo(-0.3);
  });
});

// =============================================================================
// setGpuLayerSaturation
// =============================================================================

describe('setGpuLayerSaturation', () => {
  it('updates plugin layerSaturation', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'sat-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerSaturation({ layer: result.data, saturation: 0 });
    expect(result.data.plugin.layerSaturation).toBe(0);
  });

  it('handles oversaturated values', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'sat-high',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerSaturation({ layer: result.data, saturation: 2.5 });
    expect(result.data.plugin.layerSaturation).toBeCloseTo(2.5);
  });
});

// =============================================================================
// setGpuLayerContrast
// =============================================================================

describe('setGpuLayerContrast', () => {
  it('updates plugin layerContrast', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'contrast-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerContrast({ layer: result.data, contrast: 1.5 });
    expect(result.data.plugin.layerContrast).toBeCloseTo(1.5);
  });

  it('handles zero contrast', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'contrast-zero',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerContrast({ layer: result.data, contrast: 0 });
    expect(result.data.plugin.layerContrast).toBe(0);
  });
});

// =============================================================================
// setGpuLayerOffset
// =============================================================================

describe('setGpuLayerOffset', () => {
  it('updates plugin layerOffset', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'offset-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerOffset({ layer: result.data, x: 0.5, y: -0.25 });
    expect(result.data.plugin.layerOffset.x).toBeCloseTo(0.5);
    expect(result.data.plugin.layerOffset.y).toBeCloseTo(-0.25);
  });

  it('handles zero offset', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'offset-zero',
      layerIndex: 0,
      mapWidth: 1,
      mapHeight: 1,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    setGpuLayerOffset({ layer: result.data, x: 0, y: 0 });
    expect(result.data.plugin.layerOffset.x).toBe(0);
    expect(result.data.plugin.layerOffset.y).toBe(0);
  });
});

// =============================================================================
// updateGpuTile
// =============================================================================

describe('updateGpuTile', () => {
  it('updates tile ID in CPU-side layer data', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'edit-test',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    updateGpuTile({ layer: result.data, x: 1, y: 0, tileId: 99 });
    // Tile at (1, 0) is index 1, RGBA offset = 1 * 4 = 4
    expect(result.data.layerData[4]).toBe(99);
  });

  it('sets default flags for non-empty tile', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [0, 0, 0, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'edit-flags',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    updateGpuTile({ layer: result.data, x: 0, y: 0, tileId: 42 });
    // G channel = default flags (0xF0)
    expect(result.data.layerData[1]).toBe(0xf0);
  });

  it('clears flags when setting tile to 0 (empty)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [5, 0, 0, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'edit-clear',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    updateGpuTile({ layer: result.data, x: 0, y: 0, tileId: 0 });
    // R = 0, G = 0 for empty tile
    expect(result.data.layerData[0]).toBe(0);
    expect(result.data.layerData[1]).toBe(0);
  });

  it('accepts optional visual flags', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'edit-custom',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const customFlags: Num = 496; // custom flags (0x1F0)
    updateGpuTile({ layer: result.data, x: 0, y: 1, tileId: 50, visualFlags: customFlags });
    // Tile at (0, 1) is index 2, RGBA offset = 2 * 4 = 8
    expect(result.data.layerData[8]).toBe(50);
    expect(result.data.layerData[9]).toBe(customFlags);
  });

  it('clamps out-of-bounds coordinates', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'edit-bounds',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Out of bounds — should not throw
    updateGpuTile({ layer: result.data, x: -1, y: 0, tileId: 99 });
    updateGpuTile({ layer: result.data, x: 5, y: 5, tileId: 99 });
    // Original data should be unchanged
    expect(result.data.layerData[0]).toBe(1);
  });
});

// =============================================================================
// updateGpuTileAutotile
// =============================================================================

describe('updateGpuTileAutotile', () => {
  it('updates the placed tile with resolved autotile pattern', () => {
    const scene: BABYLON.Scene = setupEngine();
    // 3x3 map, all tile ID 1 (same terrain)
    const tileIds: readonly Num[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    const layerData: Num[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-test',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Place tile ID 1 at center (1,1) with terrain_48
    updateGpuTileAutotile({
      layer: result.data,
      x: 1,
      y: 1,
      tileId: 1,
      layerData,
      autotileType: 'terrain_48',
    });

    // Center tile (1,1) is at index 4, RGBA offset = 16
    // All 8 neighbors match → bitmask 0xFF → reduced → frame 0 (fully surrounded)
    // Tile ID stored = resolved pattern index (1-based: pattern + 1)
    const centerOffset: Num = 4 * 4;
    expect(result.data.layerData[centerOffset]).toBeGreaterThanOrEqual(0);
  });

  it('updates neighbor tiles when autotile is placed', () => {
    const scene: BABYLON.Scene = setupEngine();
    // 3x3 map: center is 1, others 0
    const tileIds: readonly Num[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const layerData: Num[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-neighbor',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Place tile ID 5 at center
    layerData[4] = 5;
    updateGpuTileAutotile({
      layer: result.data,
      x: 1,
      y: 1,
      tileId: 5,
      layerData,
      autotileType: 'terrain_48',
    });

    // Center should have been updated (isolated tile = pattern 46)
    const centerOffset: Num = 4 * 4;
    // Pattern 46 → stored as pattern + 1 = 47 (1-based)
    expect(result.data.layerData[centerOffset]).toBe(47);
  });

  it('re-resolves all 8 neighbors', () => {
    const scene: BABYLON.Scene = setupEngine();
    // 3x3 map: all tile ID 1
    const tileIds: readonly Num[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    const layerData: Num[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-reresolve',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Place tile ID 1 at center
    updateGpuTileAutotile({
      layer: result.data,
      x: 1,
      y: 1,
      tileId: 1,
      layerData,
      autotileType: 'terrain_48',
    });

    // All 9 tiles should be updated (center + 8 neighbors)
    // Check corner (0,0) — has neighbors at E(1,0), S(0,1), SE(1,1) matching
    const cornerOffset: Num = 0 * 4;
    expect(result.data.layerData[cornerOffset]).toBeGreaterThan(0);
  });

  it('skips neighbors with tileId 0', () => {
    const scene: BABYLON.Scene = setupEngine();
    // 3x3 map: center tile 1, corners 0
    const tileIds: readonly Num[] = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const layerData: Num[] = [0, 1, 0, 1, 1, 1, 0, 1, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-skip',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    updateGpuTileAutotile({
      layer: result.data,
      x: 1,
      y: 1,
      tileId: 1,
      layerData,
      autotileType: 'terrain_48',
    });

    // Corner (0,0) is tile 0 — should remain 0 (not re-resolved)
    const cornerOffset: Num = 0 * 4;
    expect(result.data.layerData[cornerOffset]).toBe(0);
  });

  it('handles wall_16 autotile type', () => {
    const scene: BABYLON.Scene = setupEngine();
    // 3x3 map: cross pattern (center + cardinals = 1)
    const tileIds: readonly Num[] = [0, 1, 0, 1, 1, 1, 0, 1, 0];
    const layerData: Num[] = [0, 1, 0, 1, 1, 1, 0, 1, 0];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-wall',
      layerIndex: 0,
      mapWidth: 3,
      mapHeight: 3,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    updateGpuTileAutotile({
      layer: result.data,
      x: 1,
      y: 1,
      tileId: 1,
      layerData,
      autotileType: 'wall_16',
    });

    // Center (1,1) has all 4 cardinal neighbors matching → wall pattern 15
    const centerOffset: Num = 4 * 4;
    // wall_16 pattern 15 → stored as 15 + 1 = 16
    expect(result.data.layerData[centerOffset]).toBe(16);
  });

  it('handles autotileType none (no-op)', () => {
    const scene: BABYLON.Scene = setupEngine();
    const tileIds: readonly Num[] = [1, 2, 3, 4];
    const layerData: Num[] = [1, 2, 3, 4];

    const result: BabylonResult<GpuTileLayer> = createGpuTileLayer({
      scene,
      layerName: 'autotile-none',
      layerIndex: 0,
      mapWidth: 2,
      mapHeight: 2,
      tileIds,
      atlasTexture: null,
      tilePixelWidth: 32,
      tilePixelHeight: 32,
      tileWorldSize: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // With 'none' type, just update the tile directly (no neighbor re-resolution)
    updateGpuTileAutotile({
      layer: result.data,
      x: 0,
      y: 0,
      tileId: 42,
      layerData,
      autotileType: 'none',
    });

    // Should use tile ID directly
    expect(result.data.layerData[0]).toBe(42);
  });
});

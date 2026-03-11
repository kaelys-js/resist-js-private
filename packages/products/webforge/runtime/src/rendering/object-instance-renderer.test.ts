/**
 * Thin-instance object renderer tests.
 *
 * Tests for object instance rendering: base mesh creation,
 * instance management, frustum culling, and disposal.
 *
 * @module
 */

import type * as BABYLON from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import type { Num } from '@/schemas/common';

import { createTestEngine, disposeEngine, type BabylonEngineInstance } from '../core/engine';
import type { BabylonResult } from '../core/babylon-result';

import {
  createObjectRenderer,
  disposeObjectRenderer,
  addObjectInstance,
  removeObjectInstance,
  moveObjectInstance,
  updateVisibleInstances,
  getObjectsInRect,
  type ObjectInstanceRenderer,
} from './object-instance-renderer';

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
// createObjectRenderer
// =============================================================================

describe('createObjectRenderer', () => {
  it('creates renderer with base meshes for each unique type', () => {
    const scene: BABYLON.Scene = setupEngine();
    const result = createObjectRenderer({
      scene,
      instances: [
        { id: 'a', meshType: 'torch', position: [10, 0, 10] },
        { id: 'b', meshType: 'torch', position: [20, 0, 20] },
        { id: 'c', meshType: 'tree', position: [30, 0, 30] },
      ],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.baseMeshes.size).toBe(2);
    expect(result.data.baseMeshes.has('torch')).toBe(true);
    expect(result.data.baseMeshes.has('tree')).toBe(true);
  });

  it('creates renderer with empty instances', () => {
    const scene: BABYLON.Scene = setupEngine();
    const result = createObjectRenderer({
      scene,
      instances: [],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.baseMeshes.size).toBe(0);
  });
});

// =============================================================================
// addObjectInstance
// =============================================================================

describe('addObjectInstance', () => {
  it('adds an instance and marks mesh type dirty', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [{ id: 'a', meshType: 'torch', position: [10, 0, 10] }],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;
    addObjectInstance({
      renderer,
      instance: { id: 'b', meshType: 'torch', position: [50, 0, 50] },
    });

    const items = getObjectsInRect({
      renderer,
      rect: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(items.length).toBe(2);
    expect(renderer.dirtyMeshTypes.has('torch')).toBe(true);
  });

  it('creates base mesh for new mesh type', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [{ id: 'a', meshType: 'torch', position: [10, 0, 10] }],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;
    addObjectInstance({
      renderer,
      instance: { id: 'c', meshType: 'barrel', position: [30, 0, 30] },
    });

    expect(renderer.baseMeshes.has('barrel')).toBe(true);
  });
});

// =============================================================================
// removeObjectInstance
// =============================================================================

describe('removeObjectInstance', () => {
  it('removes an instance and marks mesh type dirty', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [
        { id: 'a', meshType: 'torch', position: [10, 0, 10] },
        { id: 'b', meshType: 'torch', position: [50, 0, 50] },
      ],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;
    renderer.dirtyMeshTypes.clear();

    const removed: boolean = removeObjectInstance({ renderer, instanceId: 'a' });
    expect(removed).toBe(true);
    expect(renderer.dirtyMeshTypes.has('torch')).toBe(true);

    const items = getObjectsInRect({
      renderer,
      rect: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(items.length).toBe(1);
  });
});

// =============================================================================
// moveObjectInstance
// =============================================================================

describe('moveObjectInstance', () => {
  it('updates instance position in quadtree', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [{ id: 'a', meshType: 'torch', position: [10, 0, 10] }],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;
    moveObjectInstance({
      renderer,
      instanceId: 'a',
      newPosition: [80, 0, 80],
    });

    // Old position should be empty
    const oldItems = getObjectsInRect({
      renderer,
      rect: { minX: 0, minZ: 0, maxX: 20, maxZ: 20 },
    });
    expect(oldItems.length).toBe(0);

    // New position should have the item
    const newItems = getObjectsInRect({
      renderer,
      rect: { minX: 70, minZ: 70, maxX: 90, maxZ: 90 },
    });
    expect(newItems.length).toBe(1);
  });
});

// =============================================================================
// updateVisibleInstances
// =============================================================================

describe('updateVisibleInstances', () => {
  it('updates instance buffers for visible objects', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [
        { id: 'a', meshType: 'torch', position: [10, 0, 10] },
        { id: 'b', meshType: 'torch', position: [90, 0, 90] },
      ],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;

    // View only bottom-left corner
    updateVisibleInstances({
      renderer,
      viewportMinX: 0,
      viewportMinZ: 0,
      viewportMaxX: 50,
      viewportMaxZ: 50,
    });

    // Only 1 instance visible
    const mesh = renderer.baseMeshes.get('torch');
    expect(mesh?.thinInstanceCount).toBe(1);
  });

  it('sets instance count to 0 for types with no visible instances', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [{ id: 'a', meshType: 'torch', position: [90, 0, 90] }],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;

    // View area that doesn't contain any torches
    updateVisibleInstances({
      renderer,
      viewportMinX: 0,
      viewportMinZ: 0,
      viewportMaxX: 20,
      viewportMaxZ: 20,
    });

    const mesh = renderer.baseMeshes.get('torch');
    expect(mesh?.thinInstanceCount).toBe(0);
  });
});

// =============================================================================
// getObjectsInRect
// =============================================================================

describe('getObjectsInRect', () => {
  it('returns objects in query rect', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [
        { id: 'a', meshType: 'torch', position: [10, 0, 10] },
        { id: 'b', meshType: 'tree', position: [90, 0, 90] },
      ],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const items = getObjectsInRect({
      renderer: createResult.data,
      rect: { minX: 0, minZ: 0, maxX: 50, maxZ: 50 },
    });
    expect(items.length).toBe(1);
    expect(items[0]?.id).toBe('a');
  });
});

// =============================================================================
// disposeObjectRenderer
// =============================================================================

describe('disposeObjectRenderer', () => {
  it('disposes all base meshes', () => {
    const scene: BABYLON.Scene = setupEngine();
    const createResult = createObjectRenderer({
      scene,
      instances: [
        { id: 'a', meshType: 'torch', position: [10, 0, 10] },
        { id: 'b', meshType: 'tree', position: [30, 0, 30] },
      ],
      worldBounds: { minX: 0, minZ: 0, maxX: 100, maxZ: 100 },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const renderer: ObjectInstanceRenderer = createResult.data;
    const meshCountBefore: Num = scene.meshes.length;

    disposeObjectRenderer({ renderer });

    expect(scene.meshes.length).toBeLessThan(meshCountBefore);
    expect(renderer.baseMeshes.size).toBe(0);
  });
});

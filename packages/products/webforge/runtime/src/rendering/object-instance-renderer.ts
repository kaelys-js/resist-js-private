/**
 * Thin-instance object renderer — 1 draw call per unique mesh type.
 *
 * Uses Babylon.js thin instances to render thousands of placed objects
 * (props, NPCs, events) with minimal draw calls. A quadtree spatial
 * index enables fast per-frame frustum culling.
 *
 * @example
 * ```typescript
 * import { createObjectRenderer, updateVisibleInstances } from './object-instance-renderer';
 *
 * const result = createObjectRenderer({ scene, instances, worldBounds });
 * if (result.ok) updateVisibleInstances({ renderer: result.data, viewportMinX: 0, ... });
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import {
  createQuadtree,
  insertItem,
  removeItem,
  queryRect,
  type Quadtree,
  type QuadtreeItem,
  type AABB,
} from './object-quadtree';

// =============================================================================
// Types
// =============================================================================

/** Input instance data (minimal, pre-validation). */
type InstanceInput = {
  readonly id: string;
  readonly meshType: string;
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
};

/** The object instance renderer state. */
export type ObjectInstanceRenderer = {
  /** One base mesh per unique meshType. */
  baseMeshes: Map<string, BABYLON.Mesh>;
  /** Quadtree spatial index for all instances. */
  quadtree: Quadtree;
  /** Instance data by ID (for transform lookups). */
  instanceData: Map<string, InstanceInput>;
  /** Mesh types that need instance buffer rebuild. */
  dirtyMeshTypes: Set<string>;
  /** ID → meshType mapping (for removal). */
  instanceMeshTypes: Map<string, string>;
  /** The Babylon.js scene. */
  scene: BABYLON.Scene;
};

// =============================================================================
// Options
// =============================================================================

/** Options for {@link createObjectRenderer}. */
type CreateObjectRendererOptions = {
  /** The Babylon.js scene. */
  readonly scene: BABYLON.Scene;
  /** Initial object instances. */
  readonly instances: readonly InstanceInput[];
  /** World bounds for the quadtree. */
  readonly worldBounds: AABB;
};

/** Options for {@link addObjectInstance}. */
type AddObjectInstanceOptions = {
  /** The renderer to add to. */
  readonly renderer: ObjectInstanceRenderer;
  /** The instance to add. */
  readonly instance: InstanceInput;
};

/** Options for {@link removeObjectInstance}. */
type RemoveObjectInstanceOptions = {
  /** The renderer to remove from. */
  readonly renderer: ObjectInstanceRenderer;
  /** ID of the instance to remove. */
  readonly instanceId: string;
};

/** Options for {@link moveObjectInstance}. */
type MoveObjectInstanceOptions = {
  /** The renderer. */
  readonly renderer: ObjectInstanceRenderer;
  /** ID of the instance to move. */
  readonly instanceId: string;
  /** New world position [x, y, z]. */
  readonly newPosition: readonly [number, number, number];
};

/** Options for {@link updateVisibleInstances}. */
type UpdateVisibleInstancesOptions = {
  /** The renderer. */
  readonly renderer: ObjectInstanceRenderer;
  /** Viewport min X in world coordinates. */
  readonly viewportMinX: Num;
  /** Viewport min Z in world coordinates. */
  readonly viewportMinZ: Num;
  /** Viewport max X in world coordinates. */
  readonly viewportMaxX: Num;
  /** Viewport max Z in world coordinates. */
  readonly viewportMaxZ: Num;
};

/** Options for {@link getObjectsInRect}. */
type GetObjectsInRectOptions = {
  /** The renderer. */
  readonly renderer: ObjectInstanceRenderer;
  /** Query AABB. */
  readonly rect: AABB;
};

/** Options for {@link disposeObjectRenderer}. */
type DisposeObjectRendererOptions = {
  /** The renderer to dispose. */
  readonly renderer: ObjectInstanceRenderer;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Creates a placeholder base mesh for a given mesh type.
 *
 * In production, this would load the actual mesh asset. For now,
 * creates a simple box as a placeholder.
 *
 * @param scene - The Babylon.js scene
 * @param meshType - The mesh type identifier
 * @returns A placeholder mesh
 */
function createBaseMesh(scene: BABYLON.Scene, meshType: string): BABYLON.Mesh {
  const mesh: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox(
    `obj-base-${meshType}`,
    { size: 1 },
    scene,
  );
  mesh.isVisible = false; // Base mesh is invisible; thin instances are visible
  return mesh;
}

/**
 * Creates a quadtree item from an instance input.
 *
 * @param inst - The instance data
 * @returns A QuadtreeItem with 1×1 bounds centered on the instance position
 */
function instanceToItem(inst: InstanceInput): QuadtreeItem {
  const [x, , z] = inst.position;
  return {
    id: inst.id,
    bounds: { minX: x - 0.5, minZ: z - 0.5, maxX: x + 0.5, maxZ: z + 0.5 },
  };
}

/**
 * Builds a 4×4 transform matrix from position/rotation/scale.
 *
 * @param inst - The instance data
 * @param out - Output Float32Array to write 16 floats into
 * @param offset - Offset in the output array
 */
function writeTransformMatrix(inst: InstanceInput, out: Float32Array, offset: Num): void {
  const [px, py, pz] = inst.position;
  const [rx, ry, rz] = inst.rotation ?? [0, 0, 0];
  const [sx, sy, sz] = inst.scale ?? [1, 1, 1];

  const matrix: BABYLON.Matrix = BABYLON.Matrix.Compose(
    new BABYLON.Vector3(sx, sy, sz),
    BABYLON.Quaternion.FromEulerAngles(rx, ry, rz),
    new BABYLON.Vector3(px, py, pz),
  );

  const values: Float32Array<ArrayBufferLike> = matrix.toArray() as Float32Array<ArrayBufferLike>;
  for (let i: Num = 0; i < 16; i++) {
    out[offset + i] = values[i] ?? 0;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Creates an object instance renderer.
 *
 * Initializes base meshes for each unique mesh type, populates the
 * quadtree spatial index, and stores instance data.
 *
 * @param options - Scene, initial instances, world bounds
 * @returns BabylonResult containing the renderer
 *
 * @example
 * ```typescript
 * const result = createObjectRenderer({
 *   scene, instances: [{ id: 'a', meshType: 'torch', position: [10, 0, 10] }],
 *   worldBounds: { minX: 0, minZ: 0, maxX: 1000, maxZ: 1000 },
 * });
 * ```
 */
export function createObjectRenderer(
  options: CreateObjectRendererOptions,
): BabylonResult<ObjectInstanceRenderer> {
  const { scene, instances, worldBounds } = options;

  try {
    const baseMeshes = new Map<string, BABYLON.Mesh>();
    const instanceData = new Map<string, InstanceInput>();
    const instanceMeshTypes = new Map<string, string>();
    const dirtyMeshTypes = new Set<string>();

    const quadtree: Quadtree = createQuadtree({
      bounds: worldBounds,
      maxDepth: 8,
      maxItemsPerNode: 32,
    });

    // Register unique mesh types and populate quadtree
    for (const inst of instances) {
      if (!baseMeshes.has(inst.meshType)) {
        baseMeshes.set(inst.meshType, createBaseMesh(scene, inst.meshType));
      }
      insertItem(quadtree, instanceToItem(inst));
      instanceData.set(inst.id, inst);
      instanceMeshTypes.set(inst.id, inst.meshType);
      dirtyMeshTypes.add(inst.meshType);
    }

    const renderer: ObjectInstanceRenderer = {
      baseMeshes,
      quadtree,
      instanceData,
      dirtyMeshTypes,
      instanceMeshTypes,
      scene,
    };

    return okShallow(renderer);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

/**
 * Adds a new object instance at runtime.
 *
 * Creates a base mesh if this is a new mesh type. Inserts into the
 * quadtree and marks the mesh type as dirty for buffer rebuild.
 *
 * @param options - Renderer and instance to add
 *
 * @example
 * ```typescript
 * addObjectInstance({ renderer, instance: { id: 'b', meshType: 'torch', position: [50, 0, 50] } });
 * ```
 */
export function addObjectInstance(options: AddObjectInstanceOptions): void {
  const { renderer, instance: inst } = options;

  if (!renderer.baseMeshes.has(inst.meshType)) {
    renderer.baseMeshes.set(inst.meshType, createBaseMesh(renderer.scene, inst.meshType));
  }

  insertItem(renderer.quadtree, instanceToItem(inst));
  renderer.instanceData.set(inst.id, inst);
  renderer.instanceMeshTypes.set(inst.id, inst.meshType);
  renderer.dirtyMeshTypes.add(inst.meshType);
}

/**
 * Removes an object instance by ID.
 *
 * Removes from the quadtree and marks the mesh type as dirty.
 *
 * @param options - Renderer and instance ID
 * @returns True if removed, false if not found
 *
 * @example
 * ```typescript
 * const removed = removeObjectInstance({ renderer, instanceId: 'torch-1' });
 * ```
 */
export function removeObjectInstance(options: RemoveObjectInstanceOptions): boolean {
  const { renderer, instanceId } = options;
  const meshType: string | undefined = renderer.instanceMeshTypes.get(instanceId);

  const removed: boolean = removeItem(renderer.quadtree, instanceId);
  if (removed) {
    renderer.instanceData.delete(instanceId);
    renderer.instanceMeshTypes.delete(instanceId);
    if (meshType) {
      renderer.dirtyMeshTypes.add(meshType);
    }
  }
  return removed;
}

/**
 * Moves an object instance to a new position.
 *
 * Removes and re-inserts in the quadtree, updates instance data,
 * and marks the mesh type as dirty.
 *
 * @param options - Renderer, instance ID, and new position
 *
 * @example
 * ```typescript
 * moveObjectInstance({ renderer, instanceId: 'torch-1', newPosition: [80, 0, 80] });
 * ```
 */
export function moveObjectInstance(options: MoveObjectInstanceOptions): void {
  const { renderer, instanceId, newPosition } = options;
  const existing: InstanceInput | undefined = renderer.instanceData.get(instanceId);
  if (!existing) return;

  // Remove from quadtree
  removeItem(renderer.quadtree, instanceId);

  // Update instance data
  const updated: InstanceInput = { ...existing, position: newPosition };
  renderer.instanceData.set(instanceId, updated);

  // Re-insert with new bounds
  insertItem(renderer.quadtree, instanceToItem(updated));

  const meshType: string | undefined = renderer.instanceMeshTypes.get(instanceId);
  if (meshType) {
    renderer.dirtyMeshTypes.add(meshType);
  }
}

/**
 * Updates visible instances based on the current viewport.
 *
 * Queries the quadtree for objects in the viewport, groups by mesh
 * type, and rebuilds thin instance transform buffers.
 *
 * @param options - Renderer and viewport bounds
 *
 * @example
 * ```typescript
 * updateVisibleInstances({
 *   renderer, viewportMinX: 0, viewportMinZ: 0, viewportMaxX: 50, viewportMaxZ: 50,
 * });
 * ```
 */
export function updateVisibleInstances(options: UpdateVisibleInstancesOptions): void {
  const { renderer, viewportMinX, viewportMinZ, viewportMaxX, viewportMaxZ } = options;

  // Query visible objects from quadtree
  const visible: QuadtreeItem[] = queryRect(renderer.quadtree, {
    minX: viewportMinX,
    minZ: viewportMinZ,
    maxX: viewportMaxX,
    maxZ: viewportMaxZ,
  });

  // Group visible objects by mesh type
  const byType = new Map<string, InstanceInput[]>();
  for (const item of visible) {
    const inst: InstanceInput | undefined = renderer.instanceData.get(item.id);
    if (!inst) continue;
    let list: InstanceInput[] | undefined = byType.get(inst.meshType);
    if (!list) {
      list = [];
      byType.set(inst.meshType, list);
    }
    list.push(inst);
  }

  // Update instance buffers for each mesh type
  for (const [meshType, mesh] of renderer.baseMeshes) {
    const instances: InstanceInput[] | undefined = byType.get(meshType);
    if (!instances || instances.length === 0) {
      mesh.thinInstanceCount = 0;
      continue;
    }

    // Build transform matrix buffer
    const matrices: Float32Array = new Float32Array(instances.length * 16);
    for (let i: Num = 0; i < instances.length; i++) {
      const inst: InstanceInput | undefined = instances[i];
      if (inst) {
        writeTransformMatrix(inst, matrices, i * 16);
      }
    }

    mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
  }

  renderer.dirtyMeshTypes.clear();
}

/**
 * Queries objects overlapping a world AABB.
 *
 * @param options - Renderer and query rectangle
 * @returns Array of quadtree items in the rect
 *
 * @example
 * ```typescript
 * const objects = getObjectsInRect({ renderer, rect: { minX: 0, minZ: 0, maxX: 50, maxZ: 50 } });
 * ```
 */
export function getObjectsInRect(options: GetObjectsInRectOptions): QuadtreeItem[] {
  return queryRect(options.renderer.quadtree, options.rect);
}

/**
 * Disposes all resources held by the object renderer.
 *
 * Disposes all base meshes and clears internal state.
 *
 * @param options - The renderer to dispose
 *
 * @example
 * ```typescript
 * disposeObjectRenderer({ renderer });
 * ```
 */
export function disposeObjectRenderer(options: DisposeObjectRendererOptions): void {
  const { renderer } = options;

  for (const [, mesh] of renderer.baseMeshes) {
    mesh.dispose();
  }
  renderer.baseMeshes.clear();
  renderer.instanceData.clear();
  renderer.instanceMeshTypes.clear();
  renderer.dirtyMeshTypes.clear();
}

/**
 * Tile streaming manager — region-based loading for large maps.
 *
 * Divides tile maps larger than 16384² into square regions, loading
 * and unloading them based on camera viewport proximity. Uses LRU
 * eviction to stay within the configured memory budget.
 *
 * Each region is a {@link GpuTileLayer} covering a regionSize × regionSize
 * tile area. The manager creates/disposes these on demand as the camera
 * moves across the map.
 *
 * @example
 * ```typescript
 * import { createStreamingManager, updateStreamingViewport } from './tile-streaming';
 *
 * const result = createStreamingManager({ scene, mapWidth: 50000, ... });
 * if (result.ok) updateStreamingViewport({ manager: result.data, viewportMinX: 0, ... });
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import type { Num } from '@/schemas/common';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import { createGpuTileLayer, disposeGpuTileLayer, type GpuTileLayer } from './gpu-tile-renderer';
import type { StreamingConfig } from './streaming-config';

// =============================================================================
// Schemas
// =============================================================================

/** A loaded streaming region. */
export const StreamingRegionSchema = v.strictObject({
  /** The GPU tile layer for this region. */
  gpuLayer: v.custom<GpuTileLayer>((val): val is GpuTileLayer => typeof val === 'object'),
  /** Region X coordinate in the region grid. */
  regionX: v.number(),
  /** Region Z coordinate in the region grid. */
  regionZ: v.number(),
  /** Frame number when this region was last accessed (for LRU). */
  lastAccessFrame: v.number(),
});

/** A loaded streaming region. */
export type StreamingRegion = v.InferOutput<typeof StreamingRegionSchema>;

/** The streaming manager state. */
export const StreamingManagerSchema = v.strictObject({
  /** Currently loaded regions. */
  regions: v.custom<StreamingRegion[]>((val): val is StreamingRegion[] => Array.isArray(val)),
  /** Streaming configuration. */
  config: v.custom<StreamingConfig>((val): val is StreamingConfig => typeof val === 'object'),
  /** The Babylon.js scene. */
  scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
  /** Full map width in tiles. */
  mapWidth: v.number(),
  /** Full map height in tiles. */
  mapHeight: v.number(),
  /** CPU-side tile data for the full map (flat row-major). */
  tileData: v.custom<Num[]>((val): val is Num[] => Array.isArray(val)),
  /** Tileset atlas texture (nullable for testing). */
  atlasTexture: v.nullable(
    v.custom<BABYLON.Texture>((val): val is BABYLON.Texture => val instanceof BABYLON.Texture),
  ),
  /** Tile pixel width (for atlas grid auto-computation). */
  tilePixelWidth: v.number(),
  /** Tile pixel height (for atlas grid auto-computation). */
  tilePixelHeight: v.number(),
  /** Size of one tile in world units. */
  tileWorldSize: v.number(),
});

/** The streaming manager state. */
export type StreamingManager = v.InferOutput<typeof StreamingManagerSchema>;

// =============================================================================
// Options Schemas
// =============================================================================

/** Options schema for {@link createStreamingManager}. */
export const CreateStreamingManagerOptionsSchema = v.pipe(
  v.strictObject({
    /** The Babylon.js scene. */
    scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
    /** Full map width in tiles. */
    mapWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Full map height in tiles. */
    mapHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** CPU-side tile data for the full map (flat row-major, length = width × height). */
    tileData: v.custom<Num[]>((val): val is Num[] => Array.isArray(val)),
    /** Streaming configuration. */
    config: v.custom<StreamingConfig>((val): val is StreamingConfig => typeof val === 'object'),
    /** Tileset atlas texture (nullable for testing). */
    atlasTexture: v.nullable(
      v.custom<BABYLON.Texture>((val): val is BABYLON.Texture => val instanceof BABYLON.Texture),
    ),
    /** Tile pixel width (for atlas grid auto-computation). */
    tilePixelWidth: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Tile pixel height (for atlas grid auto-computation). */
    tilePixelHeight: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Size of one tile in world units. */
    tileWorldSize: v.pipe(v.number(), v.minValue(0.01)),
  }),
  v.readonly(),
);

/** Options for {@link createStreamingManager}. */
export type CreateStreamingManagerOptions = v.InferOutput<
  typeof CreateStreamingManagerOptionsSchema
>;

/** Options schema for {@link updateStreamingViewport}. */
export const UpdateStreamingViewportOptionsSchema = v.pipe(
  v.strictObject({
    /** The streaming manager. */
    manager: v.custom<StreamingManager>((val): val is StreamingManager => typeof val === 'object'),
    /** Viewport min X in tile coordinates. */
    viewportMinX: v.number(),
    /** Viewport min Z in tile coordinates. */
    viewportMinZ: v.number(),
    /** Viewport max X in tile coordinates. */
    viewportMaxX: v.number(),
    /** Viewport max Z in tile coordinates. */
    viewportMaxZ: v.number(),
    /** Current frame number (for LRU tracking). */
    currentFrame: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link updateStreamingViewport}. */
export type UpdateStreamingViewportOptions = v.InferOutput<
  typeof UpdateStreamingViewportOptionsSchema
>;

/** Options schema for {@link disposeStreamingManager}. */
export const DisposeStreamingManagerOptionsSchema = v.pipe(
  v.strictObject({
    /** The streaming manager. */
    manager: v.custom<StreamingManager>((val): val is StreamingManager => typeof val === 'object'),
  }),
  v.readonly(),
);

/** Options for {@link disposeStreamingManager}. */
export type DisposeStreamingManagerOptions = v.InferOutput<
  typeof DisposeStreamingManagerOptionsSchema
>;

/** Options schema for {@link computeVisibleRegions}. */
export const ComputeVisibleRegionsOptionsSchema = v.pipe(
  v.strictObject({
    /** Viewport min X in tile coordinates. */
    viewportMinX: v.number(),
    /** Viewport min Z in tile coordinates. */
    viewportMinZ: v.number(),
    /** Viewport max X in tile coordinates. */
    viewportMaxX: v.number(),
    /** Viewport max Z in tile coordinates. */
    viewportMaxZ: v.number(),
    /** Region size in tiles. */
    regionSize: v.number(),
    /** Extra region radius to preload. */
    loadRadius: v.number(),
  }),
  v.readonly(),
);

/** Options for {@link computeVisibleRegions}. */
export type ComputeVisibleRegionsOptions = v.InferOutput<typeof ComputeVisibleRegionsOptionsSchema>;

/** A region grid coordinate. */
export const RegionCoordSchema = v.strictObject({
  /** Region X index in the grid. */
  rx: v.number(),
  /** Region Z index in the grid. */
  rz: v.number(),
});

/** A region grid coordinate. */
export type RegionCoord = v.InferOutput<typeof RegionCoordSchema>;

// =============================================================================
// computeVisibleRegions
// =============================================================================

/**
 * Computes which region grid cells are visible from the given viewport.
 *
 * @param options - Viewport bounds in tile coordinates, region size, and load radius
 * @returns Array of region grid coordinates that should be loaded
 *
 * @example
 * ```typescript
 * const regions = computeVisibleRegions({
 *   viewportMinX: 0, viewportMinZ: 0, viewportMaxX: 500, viewportMaxZ: 500,
 *   regionSize: 2048, loadRadius: 1,
 * });
 * ```
 */
export function computeVisibleRegions(options: ComputeVisibleRegionsOptions): RegionCoord[] {
  const { viewportMinX, viewportMinZ, viewportMaxX, viewportMaxZ, regionSize, loadRadius } =
    options;

  const minRx: Num = Math.max(0, Math.floor(viewportMinX / regionSize) - loadRadius);
  const minRz: Num = Math.max(0, Math.floor(viewportMinZ / regionSize) - loadRadius);
  const maxRx: Num = Math.floor(viewportMaxX / regionSize) + loadRadius;
  const maxRz: Num = Math.floor(viewportMaxZ / regionSize) + loadRadius;

  const result: RegionCoord[] = [];
  for (let rx: Num = minRx; rx <= maxRx; rx++) {
    for (let rz: Num = minRz; rz <= maxRz; rz++) {
      result.push({ rx, rz });
    }
  }

  return result;
}

// =============================================================================
// createStreamingManager
// =============================================================================

/**
 * Creates a streaming manager for region-based tile loading.
 *
 * Does not load any regions initially — call {@link updateStreamingViewport}
 * to load regions based on the current camera position.
 *
 * @param options - Scene, map data, streaming config, tileset info
 * @returns BabylonResult containing the streaming manager
 *
 * @example
 * ```typescript
 * const result = createStreamingManager({
 *   scene, mapWidth: 50000, mapHeight: 50000, tileData, config,
 *   atlasTexture, tilePixelWidth: 32, tilePixelHeight: 32, tileWorldSize: 1,
 * });
 * ```
 */
export function createStreamingManager(
  options: CreateStreamingManagerOptions,
): BabylonResult<StreamingManager> {
  const {
    scene,
    mapWidth,
    mapHeight,
    tileData,
    config,
    atlasTexture,
    tilePixelWidth,
    tilePixelHeight,
    tileWorldSize,
  } = options;

  try {
    const manager: StreamingManager = {
      regions: [],
      config,
      scene,
      mapWidth,
      mapHeight,
      tileData,
      atlasTexture,
      tilePixelWidth,
      tilePixelHeight,
      tileWorldSize,
    };

    return okShallow(manager);
  } catch (error: unknown) {
    return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// loadRegion (internal)
// =============================================================================

/**
 * Loads a single region by creating a GPU tile layer for it.
 *
 * Extracts the tile data subset for the region from the full map,
 * creates a GpuTileLayer, and positions it at the correct world offset.
 *
 * @param manager - The streaming manager
 * @param rx - Region X index
 * @param rz - Region Z index
 * @returns BabylonResult containing the streaming region, or error
 */
function loadRegion(manager: StreamingManager, rx: Num, rz: Num): BabylonResult<StreamingRegion> {
  const {
    scene,
    config,
    mapWidth,
    mapHeight,
    tileData,
    atlasTexture,
    tilePixelWidth,
    tilePixelHeight,
    tileWorldSize,
  } = manager;
  const { regionSize } = config;

  // Calculate tile bounds for this region
  const startX: Num = rx * regionSize;
  const startZ: Num = rz * regionSize;
  const endX: Num = Math.min(startX + regionSize, mapWidth);
  const endZ: Num = Math.min(startZ + regionSize, mapHeight);
  const regionW: Num = endX - startX;
  const regionH: Num = endZ - startZ;

  if (regionW <= 0 || regionH <= 0) {
    return err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Region outside map bounds');
  }

  // Extract tile data for this region
  const regionTileIds: Num[] = [];
  for (let z: Num = startZ; z < endZ; z++) {
    for (let x: Num = startX; x < endX; x++) {
      regionTileIds.push(tileData[z * mapWidth + x] ?? 0);
    }
  }

  // Create GPU tile layer for this region
  const layerResult = createGpuTileLayer({
    scene,
    layerName: `stream-${String(rx)}-${String(rz)}`,
    layerIndex: 0,
    mapWidth: regionW,
    mapHeight: regionH,
    tileIds: regionTileIds,
    atlasTexture,
    tilePixelWidth,
    tilePixelHeight,
    tileWorldSize,
    heightY: 0,
  });

  if (!layerResult.ok) return layerResult;

  // Reposition mesh to the region's world offset
  const gpuLayer: GpuTileLayer = layerResult.data;
  gpuLayer.mesh.position.x = startX * tileWorldSize + (regionW * tileWorldSize) / 2;
  gpuLayer.mesh.position.z = startZ * tileWorldSize + (regionH * tileWorldSize) / 2;

  const region: StreamingRegion = {
    gpuLayer,
    regionX: rx,
    regionZ: rz,
    lastAccessFrame: 0,
  };

  return okShallow(region);
}

// =============================================================================
// updateStreamingViewport
// =============================================================================

/**
 * Updates the streaming manager based on the current viewport.
 *
 * Loads regions that are now visible, unloads regions that are
 * beyond the unload distance, and updates LRU timestamps.
 *
 * @param options - The manager, viewport bounds, and current frame
 *
 * @example
 * ```typescript
 * updateStreamingViewport({
 *   manager, viewportMinX: 100, viewportMinZ: 100,
 *   viewportMaxX: 1000, viewportMaxZ: 1000, currentFrame: 42,
 * });
 * ```
 */
export function updateStreamingViewport(options: UpdateStreamingViewportOptions): void {
  const { manager, viewportMinX, viewportMinZ, viewportMaxX, viewportMaxZ, currentFrame } = options;
  const { config, regions } = manager;

  // 1. Compute visible regions
  const visible: RegionCoord[] = computeVisibleRegions({
    viewportMinX,
    viewportMinZ,
    viewportMaxX,
    viewportMaxZ,
    regionSize: config.regionSize,
    loadRadius: config.loadRadius,
  });

  // 2. Determine center region for unload distance calculation
  const centerRx: Num = Math.floor((viewportMinX + viewportMaxX) / 2 / config.regionSize);
  const centerRz: Num = Math.floor((viewportMinZ + viewportMaxZ) / 2 / config.regionSize);

  // 3. Load needed regions
  for (const coord of visible) {
    const existing = regions.find((r) => r.regionX === coord.rx && r.regionZ === coord.rz);
    if (existing) {
      // Touch — update LRU
      existing.lastAccessFrame = currentFrame;
    } else {
      // Load new region
      const regionResult = loadRegion(manager, coord.rx, coord.rz);
      if (regionResult.ok) {
        regionResult.data.lastAccessFrame = currentFrame;
        regions.push(regionResult.data);
      }
    }
  }

  // 4. Unload regions beyond unload distance
  const unloadDist: Num = config.unloadDistance;
  for (let i: Num = regions.length - 1; i >= 0; i--) {
    const region = regions[i];
    if (!region) continue;
    const dx: Num = Math.abs(region.regionX - centerRx);
    const dz: Num = Math.abs(region.regionZ - centerRz);
    if (dx > unloadDist || dz > unloadDist) {
      disposeGpuTileLayer({ layer: region.gpuLayer });
      regions.splice(i, 1);
    }
  }

  // 5. LRU eviction if over max
  while (regions.length > config.maxLoadedRegions) {
    // Find oldest (lowest lastAccessFrame)
    let oldestIdx: Num = 0;
    let oldestFrame: Num = Infinity;
    for (let i: Num = 0; i < regions.length; i++) {
      const r = regions[i];
      if (r && r.lastAccessFrame < oldestFrame) {
        oldestFrame = r.lastAccessFrame;
        oldestIdx = i;
      }
    }
    const evicted = regions[oldestIdx];
    if (evicted) {
      disposeGpuTileLayer({ layer: evicted.gpuLayer });
    }
    regions.splice(oldestIdx, 1);
  }
}

// =============================================================================
// disposeStreamingManager
// =============================================================================

/**
 * Disposes all loaded regions in the streaming manager.
 *
 * @param options - The streaming manager to dispose
 *
 * @example
 * ```typescript
 * disposeStreamingManager({ manager });
 * ```
 */
export function disposeStreamingManager(options: DisposeStreamingManagerOptions): void {
  const { manager } = options;

  for (const region of manager.regions) {
    disposeGpuTileLayer({ layer: region.gpuLayer });
  }
  manager.regions.length = 0;
}

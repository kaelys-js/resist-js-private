/**
 * Streaming config schema — configuration for tile map streaming/virtualization.
 *
 * Defines the region-based streaming parameters used when maps exceed
 * the single data-texture limit (16384² tiles). The streaming system
 * divides the map into regions, loading and unloading them based on
 * camera viewport proximity with LRU eviction.
 *
 * @example
 * ```typescript
 * import { StreamingConfigSchema, type StreamingConfig } from './streaming-config';
 *
 * const result = safeParse(StreamingConfigSchema, { regionSize: 4096, loadRadius: 2 });
 * if (result.ok) result.data.regionSize; // 4096
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// StreamingConfig Schema
// =============================================================================

/**
 * Configuration for tile map streaming/virtualization.
 *
 * Used when maps exceed the single data-texture limit (16384² tiles).
 * The streaming system divides the map into square regions, loading
 * and evicting them based on camera viewport proximity.
 */
export const StreamingConfigSchema = v.pipe(
  v.strictObject({
    /** Region size in tiles (2048 or 4096). */
    regionSize: v.optional(v.picklist([2048, 4096]), 2048),
    /** Max loaded regions before LRU eviction. */
    maxLoadedRegions: v.optional(
      v.pipe(v.number(), v.integer(), v.minValue(4), v.maxValue(64)),
      16,
    ),
    /** Regions beyond viewport to preload. */
    loadRadius: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(4)), 1),
    /** Regions beyond this distance get evicted. */
    unloadDistance: v.optional(v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(8)), 3),
  }),
  v.readonly(),
);

/** Streaming/virtualization configuration for large tile maps. */
export type StreamingConfig = v.InferOutput<typeof StreamingConfigSchema>;

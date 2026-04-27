/**
 * Barrel re-export for the chunk-progress component — exposes
 * the `ChunkProgress` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ChunkProgressProps, ChunkProgressPropsSchema } from './ChunkProgress.svelte';

export {
  Root,
  type ChunkProgressProps,
  ChunkProgressPropsSchema,
  //
  Root as ChunkProgress,
};

/**
 * Barrel re-export for the skeleton-text component — exposes
 * the SkeletonText Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SkeletonTextProps, SkeletonTextPropsSchema } from './SkeletonText.svelte';

export {
  Root,
  type SkeletonTextProps,
  SkeletonTextPropsSchema,
  //
  Root as SkeletonText,
};

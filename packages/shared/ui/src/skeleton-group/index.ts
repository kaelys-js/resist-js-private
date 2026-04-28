/**
 * Barrel re-export for the skeleton-group component —
 * exposes the SkeletonGroup Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SkeletonGroupProps, SkeletonGroupPropsSchema } from './SkeletonGroup.svelte';

export {
  Root,
  type SkeletonGroupProps,
  SkeletonGroupPropsSchema,
  //
  Root as SkeletonGroup,
};

/**
 * Barrel re-export for the three-d-card component — exposes
 * the ThreeDCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ThreeDCardProps, ThreeDCardPropsSchema } from './ThreeDCard.svelte';

export {
  Root,
  type ThreeDCardProps,
  ThreeDCardPropsSchema,
  //
  Root as ThreeDCard,
};

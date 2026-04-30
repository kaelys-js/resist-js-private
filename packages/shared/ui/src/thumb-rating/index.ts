/**
 * Barrel re-export for the thumb-rating component — exposes
 * the ThumbRating Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ThumbRatingProps, ThumbRatingPropsSchema } from './ThumbRating.svelte';

export {
  Root,
  type ThumbRatingProps,
  ThumbRatingPropsSchema,
  //
  Root as ThumbRating,
};

/**
 * Barrel re-export for the review-card component — exposes
 * the ReviewCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ReviewCardProps, ReviewCardPropsSchema } from './ReviewCard.svelte';

export {
  Root,
  type ReviewCardProps,
  ReviewCardPropsSchema,
  //
  Root as ReviewCard,
};

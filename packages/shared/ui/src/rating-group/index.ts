/**
 * Barrel re-export for the rating-group component — exposes
 * the RatingGroup Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RatingGroupProps, RatingGroupPropsSchema } from './RatingGroup.svelte';

export {
  Root,
  type RatingGroupProps,
  RatingGroupPropsSchema,
  //
  Root as RatingGroup,
};

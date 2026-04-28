/**
 * Barrel re-export for the satisfaction-rating component —
 * exposes the SatisfactionRating Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type SatisfactionRatingProps,
  SatisfactionRatingPropsSchema,
} from './SatisfactionRating.svelte';

export {
  Root,
  type SatisfactionRatingProps,
  SatisfactionRatingPropsSchema,
  //
  Root as SatisfactionRating,
};

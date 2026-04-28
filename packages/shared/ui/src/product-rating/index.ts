/**
 * Barrel re-export for the product-rating component — exposes
 * the ProductRating Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ProductRatingProps, ProductRatingPropsSchema } from './ProductRating.svelte';

export {
  Root,
  type ProductRatingProps,
  ProductRatingPropsSchema,
  //
  Root as ProductRating,
};

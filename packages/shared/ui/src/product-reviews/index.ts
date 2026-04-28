/**
 * Barrel re-export for the product-reviews component —
 * exposes the ProductReviews Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ProductReviewsProps, ProductReviewsPropsSchema } from './ProductReviews.svelte';

export {
  Root,
  type ProductReviewsProps,
  ProductReviewsPropsSchema,
  //
  Root as ProductReviews,
};

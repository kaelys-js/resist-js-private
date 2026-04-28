/**
 * Barrel re-export for the recommended-products component —
 * exposes the RecommendedProducts Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type RecommendedProductsProps,
  RecommendedProductsPropsSchema,
} from './RecommendedProducts.svelte';

export {
  Root,
  type RecommendedProductsProps,
  RecommendedProductsPropsSchema,
  //
  Root as RecommendedProducts,
};

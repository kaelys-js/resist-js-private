/**
 * Barrel re-export for the product-comparison component —
 * exposes the ProductComparison Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ProductComparisonProps,
  ProductComparisonPropsSchema,
} from './ProductComparison.svelte';

export {
  Root,
  type ProductComparisonProps,
  ProductComparisonPropsSchema,
  //
  Root as ProductComparison,
};

/**
 * Barrel re-export for the product-quick-view component —
 * exposes the ProductQuickView Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ProductQuickViewProps,
  ProductQuickViewPropsSchema,
} from './ProductQuickView.svelte';

export {
  Root,
  type ProductQuickViewProps,
  ProductQuickViewPropsSchema,
  //
  Root as ProductQuickView,
};

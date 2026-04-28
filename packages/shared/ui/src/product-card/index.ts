/**
 * Barrel re-export for the product-card component — exposes
 * the ProductCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ProductCardProps, ProductCardPropsSchema } from './ProductCard.svelte';

export {
  Root,
  type ProductCardProps,
  ProductCardPropsSchema,
  //
  Root as ProductCard,
};

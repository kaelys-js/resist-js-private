/**
 * Barrel re-export for the product-specs component — exposes
 * the ProductSpecs Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ProductSpecsProps, ProductSpecsPropsSchema } from './ProductSpecs.svelte';

export {
  Root,
  type ProductSpecsProps,
  ProductSpecsPropsSchema,
  //
  Root as ProductSpecs,
};

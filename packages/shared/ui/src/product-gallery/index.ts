/**
 * Barrel re-export for the product-gallery component —
 * exposes the ProductGallery Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ProductGalleryProps, ProductGalleryPropsSchema } from './ProductGallery.svelte';

export {
  Root,
  type ProductGalleryProps,
  ProductGalleryPropsSchema,
  //
  Root as ProductGallery,
};

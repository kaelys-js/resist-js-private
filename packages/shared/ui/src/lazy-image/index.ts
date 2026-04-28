/**
 * Barrel re-export for the lazy-image component — exposes the
 * LazyImage Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LazyImageProps, LazyImagePropsSchema } from './LazyImage.svelte';

export {
  Root,
  type LazyImageProps,
  LazyImagePropsSchema,
  //
  Root as LazyImage,
};

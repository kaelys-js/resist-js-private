/**
 * Barrel re-export for the image component — exposes the
 * Image Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type ImageProps, ImagePropsSchema } from './Image.svelte';

export {
  Root,
  type ImageProps,
  ImagePropsSchema,
  //
  Root as Image,
};

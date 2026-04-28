/**
 * Barrel re-export for the image-zoom component — exposes the
 * ImageZoom Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ImageZoomProps, ImageZoomPropsSchema } from './ImageZoom.svelte';

export {
  Root,
  type ImageZoomProps,
  ImageZoomPropsSchema,
  //
  Root as ImageZoom,
};

/**
 * Barrel re-export for the image-cropper component — exposes
 * the ImageCropper Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ImageCropperProps, ImageCropperPropsSchema } from './ImageCropper.svelte';

export {
  Root,
  type ImageCropperProps,
  ImageCropperPropsSchema,
  //
  Root as ImageCropper,
};

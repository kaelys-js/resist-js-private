/**
 * Barrel re-export for the image-list component — exposes the
 * ImageList Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ImageListProps, ImageListPropsSchema } from './ImageList.svelte';

export {
  Root,
  type ImageListProps,
  ImageListPropsSchema,
  //
  Root as ImageList,
};

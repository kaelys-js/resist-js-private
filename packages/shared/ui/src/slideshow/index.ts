/**
 * Barrel re-export for the slideshow component — exposes the
 * Slideshow Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SlideshowProps, SlideshowPropsSchema } from './Slideshow.svelte';

export {
  Root,
  type SlideshowProps,
  SlideshowPropsSchema,
  //
  Root as Slideshow,
};

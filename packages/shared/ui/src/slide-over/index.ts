/**
 * Barrel re-export for the slide-over component — exposes
 * the SlideOver Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SlideOverProps, SlideOverPropsSchema } from './SlideOver.svelte';

export {
  Root,
  type SlideOverProps,
  SlideOverPropsSchema,
  //
  Root as SlideOver,
};

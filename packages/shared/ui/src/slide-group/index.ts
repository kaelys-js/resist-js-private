/**
 * Barrel re-export for the slide-group component — exposes
 * the SlideGroup Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SlideGroupProps, SlideGroupPropsSchema } from './SlideGroup.svelte';

export {
  Root,
  type SlideGroupProps,
  SlideGroupPropsSchema,
  //
  Root as SlideGroup,
};

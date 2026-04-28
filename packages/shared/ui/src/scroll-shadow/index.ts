/**
 * Barrel re-export for the scroll-shadow component — exposes
 * the ScrollShadow Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ScrollShadowProps, ScrollShadowPropsSchema } from './ScrollShadow.svelte';

export {
  Root,
  type ScrollShadowProps,
  ScrollShadowPropsSchema,
  //
  Root as ScrollShadow,
};

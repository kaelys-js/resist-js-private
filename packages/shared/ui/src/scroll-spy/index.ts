/**
 * Barrel re-export for the scroll-spy component — exposes
 * the ScrollSpy Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ScrollSpyProps, ScrollSpyPropsSchema } from './ScrollSpy.svelte';

export {
  Root,
  type ScrollSpyProps,
  ScrollSpyPropsSchema,
  //
  Root as ScrollSpy,
};

/**
 * Barrel re-export for the sticky-header component — exposes
 * the StickyHeader Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StickyHeaderProps, StickyHeaderPropsSchema } from './StickyHeader.svelte';

export {
  Root,
  type StickyHeaderProps,
  StickyHeaderPropsSchema,
  //
  Root as StickyHeader,
};

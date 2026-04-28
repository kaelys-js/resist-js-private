/**
 * Barrel re-export for the outline-view component — exposes
 * the OutlineView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OutlineViewProps, OutlineViewPropsSchema } from './OutlineView.svelte';

export {
  Root,
  type OutlineViewProps,
  OutlineViewPropsSchema,
  //
  Root as OutlineView,
};

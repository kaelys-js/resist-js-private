/**
 * Barrel re-export for the split-view component — exposes
 * the SplitView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SplitViewProps, SplitViewPropsSchema } from './SplitView.svelte';

export {
  Root,
  type SplitViewProps,
  SplitViewPropsSchema,
  //
  Root as SplitView,
};

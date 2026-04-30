/**
 * Barrel re-export for the thread-view component — exposes
 * the ThreadView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ThreadViewProps, ThreadViewPropsSchema } from './ThreadView.svelte';

export {
  Root,
  type ThreadViewProps,
  ThreadViewPropsSchema,
  //
  Root as ThreadView,
};

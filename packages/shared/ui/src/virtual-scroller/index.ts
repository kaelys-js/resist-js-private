/**
 * Barrel re-export for the virtual-scroller component —
 * exposes the VirtualScroller Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type VirtualScrollerProps,
  VirtualScrollerPropsSchema,
} from './VirtualScroller.svelte';

export {
  Root,
  type VirtualScrollerProps,
  VirtualScrollerPropsSchema,
  //
  Root as VirtualScroller,
};

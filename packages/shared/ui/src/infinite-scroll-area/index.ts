/**
 * Barrel re-export for the infinite-scroll-area component —
 * exposes the InfiniteScrollArea Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type InfiniteScrollAreaProps,
  InfiniteScrollAreaPropsSchema,
} from './InfiniteScrollArea.svelte';

export {
  Root,
  type InfiniteScrollAreaProps,
  InfiniteScrollAreaPropsSchema,
  //
  Root as InfiniteScrollArea,
};

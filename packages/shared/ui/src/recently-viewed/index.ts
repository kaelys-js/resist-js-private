/**
 * Barrel re-export for the recently-viewed component —
 * exposes the RecentlyViewed Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type RecentlyViewedProps, RecentlyViewedPropsSchema } from './RecentlyViewed.svelte';

export {
  Root,
  type RecentlyViewedProps,
  RecentlyViewedPropsSchema,
  //
  Root as RecentlyViewed,
};

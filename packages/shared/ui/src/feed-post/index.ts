/**
 * Barrel re-export for the feed-post component — exposes the
 * FeedPost Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FeedPostProps, FeedPostPropsSchema } from './FeedPost.svelte';

export {
  Root,
  type FeedPostProps,
  FeedPostPropsSchema,
  //
  Root as FeedPost,
};

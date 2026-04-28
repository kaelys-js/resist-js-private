/**
 * Barrel re-export for the related-posts component — exposes
 * the RelatedPosts Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RelatedPostsProps, RelatedPostsPropsSchema } from './RelatedPosts.svelte';

export {
  Root,
  type RelatedPostsProps,
  RelatedPostsPropsSchema,
  //
  Root as RelatedPosts,
};

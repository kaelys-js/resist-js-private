/**
 * Barrel re-export for the hashtag component — exposes the
 * Hashtag Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HashtagProps, HashtagPropsSchema } from './Hashtag.svelte';

export {
  Root,
  type HashtagProps,
  HashtagPropsSchema,
  //
  Root as Hashtag,
};

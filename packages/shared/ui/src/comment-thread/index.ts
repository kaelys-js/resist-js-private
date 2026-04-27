/**
 * Barrel re-export for the comment-thread component — exposes
 * the `CommentThread` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CommentThreadProps, CommentThreadPropsSchema } from './CommentThread.svelte';

export {
  Root,
  type CommentThreadProps,
  CommentThreadPropsSchema,
  //
  Root as CommentThread,
};

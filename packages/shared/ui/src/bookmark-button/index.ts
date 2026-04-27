/**
 * Barrel re-export for the bookmark-button component — exposes
 * the `BookmarkButton` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BookmarkButtonProps, BookmarkButtonPropsSchema } from './BookmarkButton.svelte';

export {
  Root,
  type BookmarkButtonProps,
  BookmarkButtonPropsSchema,
  //
  Root as BookmarkButton,
};

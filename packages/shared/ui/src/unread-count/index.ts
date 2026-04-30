/**
 * Barrel re-export for the unread-count component — exposes
 * the UnreadCount Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type UnreadCountProps, UnreadCountPropsSchema } from './UnreadCount.svelte';

export {
  Root,
  type UnreadCountProps,
  UnreadCountPropsSchema,
  //
  Root as UnreadCount,
};

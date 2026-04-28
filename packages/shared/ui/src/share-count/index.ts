/**
 * Barrel re-export for the share-count component — exposes
 * the ShareCount Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ShareCountProps, ShareCountPropsSchema } from './ShareCount.svelte';

export {
  Root,
  type ShareCountProps,
  ShareCountPropsSchema,
  //
  Root as ShareCount,
};

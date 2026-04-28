/**
 * Barrel re-export for the share-sheet component — exposes
 * the ShareSheet Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ShareSheetProps, ShareSheetPropsSchema } from './ShareSheet.svelte';

export {
  Root,
  type ShareSheetProps,
  ShareSheetPropsSchema,
  //
  Root as ShareSheet,
};

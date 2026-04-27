/**
 * Barrel re-export for the bulk-action-bar component — exposes
 * the `BulkActionBar` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BulkActionBarProps, BulkActionBarPropsSchema } from './BulkActionBar.svelte';

export {
  Root,
  type BulkActionBarProps,
  BulkActionBarPropsSchema,
  //
  Root as BulkActionBar,
};

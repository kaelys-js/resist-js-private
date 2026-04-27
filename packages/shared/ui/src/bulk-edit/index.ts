/**
 * Barrel re-export for the bulk-edit component — exposes the
 * `BulkEdit` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BulkEditProps, BulkEditPropsSchema } from './BulkEdit.svelte';

export {
  Root,
  type BulkEditProps,
  BulkEditPropsSchema,
  //
  Root as BulkEdit,
};

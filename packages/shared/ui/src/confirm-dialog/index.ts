/**
 * Barrel re-export for the confirm-dialog component — exposes
 * the `ConfirmDialog` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ConfirmDialogProps, ConfirmDialogPropsSchema } from './ConfirmDialog.svelte';

export {
  Root,
  type ConfirmDialogProps,
  ConfirmDialogPropsSchema,
  //
  Root as ConfirmDialog,
};

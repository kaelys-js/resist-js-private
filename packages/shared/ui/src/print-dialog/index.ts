/**
 * Barrel re-export for the print-dialog component — exposes
 * the PrintDialog Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PrintDialogProps, PrintDialogPropsSchema } from './PrintDialog.svelte';

export {
  Root,
  type PrintDialogProps,
  PrintDialogPropsSchema,
  //
  Root as PrintDialog,
};

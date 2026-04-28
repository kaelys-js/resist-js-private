/**
 * Barrel re-export for the file-dialog component — exposes the
 * FileDialog Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FileDialogProps, FileDialogPropsSchema } from './FileDialog.svelte';

export {
  Root,
  type FileDialogProps,
  FileDialogPropsSchema,
  //
  Root as FileDialog,
};

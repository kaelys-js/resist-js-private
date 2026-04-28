/**
 * Barrel re-export for the file-upload component — exposes the
 * FileUpload Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FileUploadProps, FileUploadPropsSchema } from './FileUpload.svelte';

export {
  Root,
  type FileUploadProps,
  FileUploadPropsSchema,
  //
  Root as FileUpload,
};

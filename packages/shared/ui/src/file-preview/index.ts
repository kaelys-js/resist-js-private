/**
 * Barrel re-export for the file-preview component — exposes
 * the FilePreview Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FilePreviewProps, FilePreviewPropsSchema } from './FilePreview.svelte';

export {
  Root,
  type FilePreviewProps,
  FilePreviewPropsSchema,
  //
  Root as FilePreview,
};

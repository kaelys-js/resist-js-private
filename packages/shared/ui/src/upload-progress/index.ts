/**
 * Barrel re-export for the upload-progress component —
 * exposes the UploadProgress Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type UploadProgressProps, UploadProgressPropsSchema } from './UploadProgress.svelte';

export {
  Root,
  type UploadProgressProps,
  UploadProgressPropsSchema,
  //
  Root as UploadProgress,
};

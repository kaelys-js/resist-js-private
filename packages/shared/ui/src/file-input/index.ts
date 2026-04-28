/**
 * Barrel re-export for the file-input component — exposes the
 * FileInput Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FileInputProps, FileInputPropsSchema } from './FileInput.svelte';

export {
  Root,
  type FileInputProps,
  FileInputPropsSchema,
  //
  Root as FileInput,
};

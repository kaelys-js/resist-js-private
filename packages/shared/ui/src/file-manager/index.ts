/**
 * Barrel re-export for the file-manager component — exposes
 * the FileManager Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FileManagerProps, FileManagerPropsSchema } from './FileManager.svelte';

export {
  Root,
  type FileManagerProps,
  FileManagerPropsSchema,
  //
  Root as FileManager,
};

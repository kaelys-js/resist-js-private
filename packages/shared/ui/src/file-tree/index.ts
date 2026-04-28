/**
 * Barrel re-export for the file-tree component — exposes the
 * FileTree Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FileTreeProps, FileTreePropsSchema } from './FileTree.svelte';

export {
  Root,
  type FileTreeProps,
  FileTreePropsSchema,
  //
  Root as FileTree,
};

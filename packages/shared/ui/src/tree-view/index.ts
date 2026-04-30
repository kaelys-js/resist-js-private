/**
 * Barrel re-export for the tree-view component — exposes
 * the TreeView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TreeViewProps, TreeViewPropsSchema } from './TreeView.svelte';

export {
  Root,
  type TreeViewProps,
  TreeViewPropsSchema,
  //
  Root as TreeView,
};

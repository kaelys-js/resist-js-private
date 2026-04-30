/**
 * Barrel re-export for the tree-table component — exposes
 * the TreeTable Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TreeTableProps, TreeTablePropsSchema } from './TreeTable.svelte';

export {
  Root,
  type TreeTableProps,
  TreeTablePropsSchema,
  //
  Root as TreeTable,
};

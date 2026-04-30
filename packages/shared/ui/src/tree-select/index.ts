/**
 * Barrel re-export for the tree-select component — exposes
 * the TreeSelect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TreeSelectProps, TreeSelectPropsSchema } from './TreeSelect.svelte';

export {
  Root,
  type TreeSelectProps,
  TreeSelectPropsSchema,
  //
  Root as TreeSelect,
};

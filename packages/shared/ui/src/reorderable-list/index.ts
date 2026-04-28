/**
 * Barrel re-export for the reorderable-list component —
 * exposes the ReorderableList Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ReorderableListProps,
  ReorderableListPropsSchema,
} from './ReorderableList.svelte';

export {
  Root,
  type ReorderableListProps,
  ReorderableListPropsSchema,
  //
  Root as ReorderableList,
};

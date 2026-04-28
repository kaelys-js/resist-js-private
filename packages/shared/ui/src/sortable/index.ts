/**
 * Barrel re-export for the sortable component — exposes the
 * Sortable Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SortableProps, SortablePropsSchema } from './Sortable.svelte';

export {
  Root,
  type SortableProps,
  SortablePropsSchema,
  //
  Root as Sortable,
};

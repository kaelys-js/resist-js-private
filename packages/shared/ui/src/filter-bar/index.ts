/**
 * Barrel re-export for the filter-bar component — exposes the
 * FilterBar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FilterBarProps, FilterBarPropsSchema } from './FilterBar.svelte';

export {
  Root,
  type FilterBarProps,
  FilterBarPropsSchema,
  //
  Root as FilterBar,
};

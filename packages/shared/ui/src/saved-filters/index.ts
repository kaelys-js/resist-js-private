/**
 * Barrel re-export for the saved-filters component — exposes
 * the SavedFilters Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SavedFiltersProps, SavedFiltersPropsSchema } from './SavedFilters.svelte';

export {
  Root,
  type SavedFiltersProps,
  SavedFiltersPropsSchema,
  //
  Root as SavedFilters,
};

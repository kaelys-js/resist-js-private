/**
 * Barrel re-export for the search-field component — exposes
 * the SearchField Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SearchFieldProps, SearchFieldPropsSchema } from './SearchField.svelte';

export {
  Root,
  type SearchFieldProps,
  SearchFieldPropsSchema,
  //
  Root as SearchField,
};

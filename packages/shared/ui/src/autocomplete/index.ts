/**
 * Barrel re-export for the autocomplete component — exposes the
 * `Autocomplete` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AutocompleteProps, AutocompletePropsSchema } from './Autocomplete.svelte';

export {
  Root,
  type AutocompleteProps,
  AutocompletePropsSchema,
  //
  Root as Autocomplete,
};

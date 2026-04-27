/**
 * Barrel re-export for the address-autocomplete component —
 * exposes the `AddressAutocomplete` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AddressAutocompleteProps,
  AddressAutocompletePropsSchema,
} from './AddressAutocomplete.svelte';

export {
  Root,
  type AddressAutocompleteProps,
  AddressAutocompletePropsSchema,
  //
  Root as AddressAutocomplete,
};

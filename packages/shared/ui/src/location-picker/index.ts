/**
 * Barrel re-export for the location-picker component —
 * exposes the LocationPicker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type LocationPickerProps, LocationPickerPropsSchema } from './LocationPicker.svelte';

export {
  Root,
  type LocationPickerProps,
  LocationPickerPropsSchema,
  //
  Root as LocationPicker,
};

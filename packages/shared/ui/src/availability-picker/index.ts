/**
 * Barrel re-export for the availability-picker component —
 * exposes the `AvailabilityPicker` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AvailabilityPickerProps,
  AvailabilityPickerPropsSchema,
} from './AvailabilityPicker.svelte';

export {
  Root,
  type AvailabilityPickerProps,
  AvailabilityPickerPropsSchema,
  //
  Root as AvailabilityPicker,
};

/**
 * Barrel re-export for the time-zone-picker component —
 * exposes the TimeZonePicker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TimeZonePickerProps, TimeZonePickerPropsSchema } from './TimeZonePicker.svelte';

export {
  Root,
  type TimeZonePickerProps,
  TimeZonePickerPropsSchema,
  //
  Root as TimeZonePicker,
};

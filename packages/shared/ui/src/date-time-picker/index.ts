/**
 * Barrel re-export for the date-time-picker component — exposes
 * the `DateTimePicker` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DateTimePickerProps, DateTimePickerPropsSchema } from './DateTimePicker.svelte';

export {
  Root,
  type DateTimePickerProps,
  DateTimePickerPropsSchema,
  //
  Root as DateTimePicker,
};

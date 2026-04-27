/**
 * Barrel re-export for the date-picker component — exposes the
 * `DatePicker` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DatePickerProps, DatePickerPropsSchema } from './DatePicker.svelte';

export {
  Root,
  type DatePickerProps,
  DatePickerPropsSchema,
  //
  Root as DatePicker,
};

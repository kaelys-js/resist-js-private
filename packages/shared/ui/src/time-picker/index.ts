/**
 * Barrel re-export for the time-picker component — exposes
 * the TimePicker Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TimePickerProps, TimePickerPropsSchema } from './TimePicker.svelte';

export {
  Root,
  type TimePickerProps,
  TimePickerPropsSchema,
  //
  Root as TimePicker,
};

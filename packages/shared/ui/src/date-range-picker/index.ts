/**
 * Barrel re-export for the date-range-picker component — exposes
 * the `DateRangePicker` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DateRangePickerProps,
  DateRangePickerPropsSchema,
} from './DateRangePicker.svelte';

export {
  Root,
  type DateRangePickerProps,
  DateRangePickerPropsSchema,
  //
  Root as DateRangePicker,
};

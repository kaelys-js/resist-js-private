/**
 * Barrel re-export for the time-duration-picker component —
 * exposes the TimeDurationPicker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TimeDurationPickerProps,
  TimeDurationPickerPropsSchema,
} from './TimeDurationPicker.svelte';

export {
  Root,
  type TimeDurationPickerProps,
  TimeDurationPickerPropsSchema,
  //
  Root as TimeDurationPicker,
};

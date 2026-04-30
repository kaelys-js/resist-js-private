/**
 * Barrel re-export for the time-range-field component —
 * exposes the TimeRangeField Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TimeRangeFieldProps, TimeRangeFieldPropsSchema } from './TimeRangeField.svelte';

export {
  Root,
  type TimeRangeFieldProps,
  TimeRangeFieldPropsSchema,
  //
  Root as TimeRangeField,
};

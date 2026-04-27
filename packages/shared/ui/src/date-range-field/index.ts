/**
 * Barrel re-export for the date-range-field component — exposes
 * the `DateRangeField` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DateRangeFieldProps, DateRangeFieldPropsSchema } from './DateRangeField.svelte';

export {
  Root,
  type DateRangeFieldProps,
  DateRangeFieldPropsSchema,
  //
  Root as DateRangeField,
};

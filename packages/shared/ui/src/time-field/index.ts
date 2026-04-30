/**
 * Barrel re-export for the time-field component — exposes
 * the TimeField Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TimeFieldProps, TimeFieldPropsSchema } from './TimeField.svelte';

export {
  Root,
  type TimeFieldProps,
  TimeFieldPropsSchema,
  //
  Root as TimeField,
};

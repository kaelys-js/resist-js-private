/**
 * Barrel re-export for the date-field component — exposes the
 * `DateField` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DateFieldProps, DateFieldPropsSchema } from './DateField.svelte';

export {
  Root,
  type DateFieldProps,
  DateFieldPropsSchema,
  //
  Root as DateField,
};

/**
 * Barrel re-export for the form-field component — exposes the
 * FormField Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FormFieldProps, FormFieldPropsSchema } from './FormField.svelte';

export {
  Root,
  type FormFieldProps,
  FormFieldPropsSchema,
  //
  Root as FormField,
};

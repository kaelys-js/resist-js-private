/**
 * Barrel re-export for the tax-form component — exposes the
 * TaxForm Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TaxFormProps, TaxFormPropsSchema } from './TaxForm.svelte';

export {
  Root,
  type TaxFormProps,
  TaxFormPropsSchema,
  //
  Root as TaxForm,
};

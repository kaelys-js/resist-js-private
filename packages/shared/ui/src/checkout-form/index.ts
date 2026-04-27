/**
 * Barrel re-export for the checkout-form component — exposes
 * the `CheckoutForm` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CheckoutFormProps, CheckoutFormPropsSchema } from './CheckoutForm.svelte';

export {
  Root,
  type CheckoutFormProps,
  CheckoutFormPropsSchema,
  //
  Root as CheckoutForm,
};

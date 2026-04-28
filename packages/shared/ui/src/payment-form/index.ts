/**
 * Barrel re-export for the payment-form component — exposes
 * the PaymentForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PaymentFormProps, PaymentFormPropsSchema } from './PaymentForm.svelte';

export {
  Root,
  type PaymentFormProps,
  PaymentFormPropsSchema,
  //
  Root as PaymentForm,
};

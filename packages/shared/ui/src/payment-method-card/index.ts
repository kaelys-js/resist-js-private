/**
 * Barrel re-export for the payment-method-card component —
 * exposes the PaymentMethodCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PaymentMethodCardProps,
  PaymentMethodCardPropsSchema,
} from './PaymentMethodCard.svelte';

export {
  Root,
  type PaymentMethodCardProps,
  PaymentMethodCardPropsSchema,
  //
  Root as PaymentMethodCard,
};

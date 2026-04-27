/**
 * Barrel re-export for the credit-card-input component — exposes
 * the `CreditCardInput` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CreditCardInputProps,
  CreditCardInputPropsSchema,
} from './CreditCardInput.svelte';

export {
  Root,
  type CreditCardInputProps,
  CreditCardInputPropsSchema,
  //
  Root as CreditCardInput,
};

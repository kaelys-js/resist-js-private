/**
 * Barrel re-export for the currency-input component — exposes
 * the `CurrencyInput` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CurrencyInputProps, CurrencyInputPropsSchema } from './CurrencyInput.svelte';

export {
  Root,
  type CurrencyInputProps,
  CurrencyInputPropsSchema,
  //
  Root as CurrencyInput,
};

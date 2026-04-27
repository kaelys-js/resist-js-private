/**
 * Barrel re-export for the currency-display component — exposes
 * the `CurrencyDisplay` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CurrencyDisplayProps,
  CurrencyDisplayPropsSchema,
} from './CurrencyDisplay.svelte';

export {
  Root,
  type CurrencyDisplayProps,
  CurrencyDisplayPropsSchema,
  //
  Root as CurrencyDisplay,
};

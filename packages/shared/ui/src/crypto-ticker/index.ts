/**
 * Barrel re-export for the crypto-ticker component — exposes
 * the `CryptoTicker` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CryptoTickerProps, CryptoTickerPropsSchema } from './CryptoTicker.svelte';

export {
  Root,
  type CryptoTickerProps,
  CryptoTickerPropsSchema,
  //
  Root as CryptoTicker,
};

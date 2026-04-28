/**
 * Barrel re-export for the exchange-rate component — exposes
 * the ExchangeRate Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ExchangeRateProps, ExchangeRatePropsSchema } from './ExchangeRate.svelte';

export {
  Root,
  type ExchangeRateProps,
  ExchangeRatePropsSchema,
  //
  Root as ExchangeRate,
};

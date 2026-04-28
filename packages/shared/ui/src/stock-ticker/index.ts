/**
 * Barrel re-export for the stock-ticker component — exposes
 * the StockTicker Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StockTickerProps, StockTickerPropsSchema } from './StockTicker.svelte';

export {
  Root,
  type StockTickerProps,
  StockTickerPropsSchema,
  //
  Root as StockTicker,
};

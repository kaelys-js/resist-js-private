/**
 * Barrel re-export for the candlestick-chart component — exposes
 * the `CandlestickChart` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CandlestickChartProps,
  CandlestickChartPropsSchema,
} from './CandlestickChart.svelte';

export {
  Root,
  type CandlestickChartProps,
  CandlestickChartPropsSchema,
  //
  Root as CandlestickChart,
};

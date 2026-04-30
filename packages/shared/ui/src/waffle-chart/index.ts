/**
 * Barrel re-export for the waffle-chart component — exposes
 * the WaffleChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WaffleChartProps, WaffleChartPropsSchema } from './WaffleChart.svelte';

export {
  Root,
  type WaffleChartProps,
  WaffleChartPropsSchema,
  //
  Root as WaffleChart,
};

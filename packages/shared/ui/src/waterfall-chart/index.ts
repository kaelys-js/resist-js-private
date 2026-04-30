/**
 * Barrel re-export for the waterfall-chart component —
 * exposes the WaterfallChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type WaterfallChartProps, WaterfallChartPropsSchema } from './WaterfallChart.svelte';

export {
  Root,
  type WaterfallChartProps,
  WaterfallChartPropsSchema,
  //
  Root as WaterfallChart,
};

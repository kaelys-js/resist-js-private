/**
 * Barrel re-export for the bubble-chart component — exposes the
 * `BubbleChart` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BubbleChartProps, BubbleChartPropsSchema } from './BubbleChart.svelte';

export {
  Root,
  type BubbleChartProps,
  BubbleChartPropsSchema,
  //
  Root as BubbleChart,
};

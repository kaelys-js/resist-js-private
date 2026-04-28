/**
 * Barrel re-export for the line-chart component — exposes the
 * LineChart Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LineChartProps, LineChartPropsSchema } from './LineChart.svelte';

export {
  Root,
  type LineChartProps,
  LineChartPropsSchema,
  //
  Root as LineChart,
};

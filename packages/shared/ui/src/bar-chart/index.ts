/**
 * Barrel re-export for the bar-chart component — exposes the
 * `BarChart` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BarChartProps, BarChartPropsSchema } from './BarChart.svelte';

export {
  Root,
  type BarChartProps,
  BarChartPropsSchema,
  //
  Root as BarChart,
};

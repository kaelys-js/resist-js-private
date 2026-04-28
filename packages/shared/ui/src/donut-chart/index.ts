/**
 * Barrel re-export for the donut-chart component — exposes the
 * `DonutChart` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DonutChartProps, DonutChartPropsSchema } from './DonutChart.svelte';

export {
  Root,
  type DonutChartProps,
  DonutChartPropsSchema,
  //
  Root as DonutChart,
};

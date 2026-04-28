/**
 * Barrel re-export for the pie-chart component — exposes the
 * PieChart Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PieChartProps, PieChartPropsSchema } from './PieChart.svelte';

export {
  Root,
  type PieChartProps,
  PieChartPropsSchema,
  //
  Root as PieChart,
};

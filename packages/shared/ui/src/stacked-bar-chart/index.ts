/**
 * Barrel re-export for the stacked-bar-chart component —
 * exposes the StackedBarChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type StackedBarChartProps,
  StackedBarChartPropsSchema,
} from './StackedBarChart.svelte';

export {
  Root,
  type StackedBarChartProps,
  StackedBarChartPropsSchema,
  //
  Root as StackedBarChart,
};

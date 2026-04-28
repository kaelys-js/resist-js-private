/**
 * Barrel re-export for the grouped-bar-chart component —
 * exposes the GroupedBarChart Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type GroupedBarChartProps,
  GroupedBarChartPropsSchema,
} from './GroupedBarChart.svelte';

export {
  Root,
  type GroupedBarChartProps,
  GroupedBarChartPropsSchema,
  //
  Root as GroupedBarChart,
};

/**
 * Barrel re-export for the treemap-chart component — exposes
 * the TreemapChart Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type TreemapChartProps, TreemapChartPropsSchema } from './TreemapChart.svelte';

export {
  Root,
  type TreemapChartProps,
  TreemapChartPropsSchema,
  //
  Root as TreemapChart,
};

/**
 * Barrel re-export for the scatter-chart component — exposes
 * the ScatterChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ScatterChartProps, ScatterChartPropsSchema } from './ScatterChart.svelte';

export {
  Root,
  type ScatterChartProps,
  ScatterChartPropsSchema,
  //
  Root as ScatterChart,
};

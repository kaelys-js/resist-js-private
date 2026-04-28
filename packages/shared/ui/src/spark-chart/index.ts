/**
 * Barrel re-export for the spark-chart component — exposes
 * the SparkChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SparkChartProps, SparkChartPropsSchema } from './SparkChart.svelte';

export {
  Root,
  type SparkChartProps,
  SparkChartPropsSchema,
  //
  Root as SparkChart,
};

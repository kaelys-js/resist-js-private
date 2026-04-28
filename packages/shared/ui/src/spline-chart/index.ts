/**
 * Barrel re-export for the spline-chart component — exposes
 * the SplineChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SplineChartProps, SplineChartPropsSchema } from './SplineChart.svelte';

export {
  Root,
  type SplineChartProps,
  SplineChartPropsSchema,
  //
  Root as SplineChart,
};

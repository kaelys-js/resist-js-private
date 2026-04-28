/**
 * Barrel re-export for the polar-chart component — exposes
 * the PolarChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PolarChartProps, PolarChartPropsSchema } from './PolarChart.svelte';

export {
  Root,
  type PolarChartProps,
  PolarChartPropsSchema,
  //
  Root as PolarChart,
};

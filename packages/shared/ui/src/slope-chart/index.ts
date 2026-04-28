/**
 * Barrel re-export for the slope-chart component — exposes
 * the SlopeChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SlopeChartProps, SlopeChartPropsSchema } from './SlopeChart.svelte';

export {
  Root,
  type SlopeChartProps,
  SlopeChartPropsSchema,
  //
  Root as SlopeChart,
};

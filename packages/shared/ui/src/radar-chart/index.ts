/**
 * Barrel re-export for the radar-chart component — exposes
 * the RadarChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RadarChartProps, RadarChartPropsSchema } from './RadarChart.svelte';

export {
  Root,
  type RadarChartProps,
  RadarChartPropsSchema,
  //
  Root as RadarChart,
};

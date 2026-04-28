/**
 * Barrel re-export for the sunburst-chart component —
 * exposes the SunburstChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SunburstChartProps, SunburstChartPropsSchema } from './SunburstChart.svelte';

export {
  Root,
  type SunburstChartProps,
  SunburstChartPropsSchema,
  //
  Root as SunburstChart,
};

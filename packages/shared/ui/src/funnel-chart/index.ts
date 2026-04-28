/**
 * Barrel re-export for the funnel-chart component — exposes
 * the FunnelChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FunnelChartProps, FunnelChartPropsSchema } from './FunnelChart.svelte';

export {
  Root,
  type FunnelChartProps,
  FunnelChartPropsSchema,
  //
  Root as FunnelChart,
};

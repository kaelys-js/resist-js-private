/**
 * Barrel re-export for the area-chart component — exposes the
 * `AreaChart` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AreaChartProps, AreaChartPropsSchema } from './AreaChart.svelte';

export {
  Root,
  type AreaChartProps,
  AreaChartPropsSchema,
  //
  Root as AreaChart,
};

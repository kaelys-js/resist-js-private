/**
 * Barrel re-export for the lollipop-chart component — exposes
 * the LollipopChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LollipopChartProps, LollipopChartPropsSchema } from './LollipopChart.svelte';

export {
  Root,
  type LollipopChartProps,
  LollipopChartPropsSchema,
  //
  Root as LollipopChart,
};

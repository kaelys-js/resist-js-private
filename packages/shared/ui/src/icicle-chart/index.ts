/**
 * Barrel re-export for the icicle-chart component — exposes
 * the IcicleChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type IcicleChartProps, IcicleChartPropsSchema } from './IcicleChart.svelte';

export {
  Root,
  type IcicleChartProps,
  IcicleChartPropsSchema,
  //
  Root as IcicleChart,
};

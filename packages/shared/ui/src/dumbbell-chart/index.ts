/**
 * Barrel re-export for the dumbbell-chart component — exposes
 * the DumbbellChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type DumbbellChartProps, DumbbellChartPropsSchema } from './DumbbellChart.svelte';

export {
  Root,
  type DumbbellChartProps,
  DumbbellChartPropsSchema,
  //
  Root as DumbbellChart,
};

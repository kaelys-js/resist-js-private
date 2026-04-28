/**
 * Barrel re-export for the pictogram-chart component —
 * exposes the PictogramChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type PictogramChartProps, PictogramChartPropsSchema } from './PictogramChart.svelte';

export {
  Root,
  type PictogramChartProps,
  PictogramChartPropsSchema,
  //
  Root as PictogramChart,
};

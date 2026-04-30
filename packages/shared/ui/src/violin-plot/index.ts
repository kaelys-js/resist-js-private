/**
 * Barrel re-export for the violin-plot component — exposes
 * the ViolinPlot Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ViolinPlotProps, ViolinPlotPropsSchema } from './ViolinPlot.svelte';

export {
  Root,
  type ViolinPlotProps,
  ViolinPlotPropsSchema,
  //
  Root as ViolinPlot,
};

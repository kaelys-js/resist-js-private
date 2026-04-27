/**
 * Barrel re-export for the box-plot component — exposes the
 * `BoxPlot` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BoxPlotProps, BoxPlotPropsSchema } from './BoxPlot.svelte';

export {
  Root,
  type BoxPlotProps,
  BoxPlotPropsSchema,
  //
  Root as BoxPlot,
};

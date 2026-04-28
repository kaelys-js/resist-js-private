/**
 * Barrel re-export for the ridgeline-plot component — exposes
 * the RidgelinePlot Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type RidgelinePlotProps, RidgelinePlotPropsSchema } from './RidgelinePlot.svelte';

export {
  Root,
  type RidgelinePlotProps,
  RidgelinePlotPropsSchema,
  //
  Root as RidgelinePlot,
};

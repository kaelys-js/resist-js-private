/**
 * Barrel re-export for the heatmap component — exposes the
 * Heatmap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HeatmapProps, HeatmapPropsSchema } from './Heatmap.svelte';

export {
  Root,
  type HeatmapProps,
  HeatmapPropsSchema,
  //
  Root as Heatmap,
};

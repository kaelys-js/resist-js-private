/**
 * Barrel re-export for the pivot-grid component — exposes
 * the PivotGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PivotGridProps, PivotGridPropsSchema } from './PivotGrid.svelte';

export {
  Root,
  type PivotGridProps,
  PivotGridPropsSchema,
  //
  Root as PivotGrid,
};

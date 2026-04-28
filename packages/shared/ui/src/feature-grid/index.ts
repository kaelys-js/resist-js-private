/**
 * Barrel re-export for the feature-grid component — exposes
 * the FeatureGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FeatureGridProps, FeatureGridPropsSchema } from './FeatureGrid.svelte';

export {
  Root,
  type FeatureGridProps,
  FeatureGridPropsSchema,
  //
  Root as FeatureGrid,
};

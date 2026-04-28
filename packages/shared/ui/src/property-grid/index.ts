/**
 * Barrel re-export for the property-grid component — exposes
 * the PropertyGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PropertyGridProps, PropertyGridPropsSchema } from './PropertyGrid.svelte';

export {
  Root,
  type PropertyGridProps,
  PropertyGridPropsSchema,
  //
  Root as PropertyGrid,
};

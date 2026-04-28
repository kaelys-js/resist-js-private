/**
 * Barrel re-export for the flickering-grid component — exposes
 * the FlickeringGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FlickeringGridProps, FlickeringGridPropsSchema } from './FlickeringGrid.svelte';

export {
  Root,
  type FlickeringGridProps,
  FlickeringGridPropsSchema,
  //
  Root as FlickeringGrid,
};

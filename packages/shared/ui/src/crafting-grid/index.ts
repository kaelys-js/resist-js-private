/**
 * Barrel re-export for the crafting-grid component — exposes
 * the `CraftingGrid` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CraftingGridProps, CraftingGridPropsSchema } from './CraftingGrid.svelte';

export {
  Root,
  type CraftingGridProps,
  CraftingGridPropsSchema,
  //
  Root as CraftingGrid,
};

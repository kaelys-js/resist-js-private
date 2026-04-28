/**
 * Barrel re-export for the inventory-grid component — exposes
 * the InventoryGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type InventoryGridProps, InventoryGridPropsSchema } from './InventoryGrid.svelte';

export {
  Root,
  type InventoryGridProps,
  InventoryGridPropsSchema,
  //
  Root as InventoryGrid,
};

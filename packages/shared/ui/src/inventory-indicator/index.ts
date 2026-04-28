/**
 * Barrel re-export for the inventory-indicator component —
 * exposes the InventoryIndicator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type InventoryIndicatorProps,
  InventoryIndicatorPropsSchema,
} from './InventoryIndicator.svelte';

export {
  Root,
  type InventoryIndicatorProps,
  InventoryIndicatorPropsSchema,
  //
  Root as InventoryIndicator,
};

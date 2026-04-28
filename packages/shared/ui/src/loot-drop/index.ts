/**
 * Barrel re-export for the loot-drop component — exposes the
 * LootDrop Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LootDropProps, LootDropPropsSchema } from './LootDrop.svelte';

export {
  Root,
  type LootDropProps,
  LootDropPropsSchema,
  //
  Root as LootDrop,
};

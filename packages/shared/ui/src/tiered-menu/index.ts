/**
 * Barrel re-export for the tiered-menu component — exposes
 * the TieredMenu Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TieredMenuProps, TieredMenuPropsSchema } from './TieredMenu.svelte';

export {
  Root,
  type TieredMenuProps,
  TieredMenuPropsSchema,
  //
  Root as TieredMenu,
};

/**
 * Barrel re-export for the mega-menu component — exposes the
 * MegaMenu Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MegaMenuProps, MegaMenuPropsSchema } from './MegaMenu.svelte';

export {
  Root,
  type MegaMenuProps,
  MegaMenuPropsSchema,
  //
  Root as MegaMenu,
};

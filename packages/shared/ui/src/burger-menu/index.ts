/**
 * Barrel re-export for the burger-menu component — exposes the
 * `BurgerMenu` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BurgerMenuProps, BurgerMenuPropsSchema } from './BurgerMenu.svelte';

export {
  Root,
  type BurgerMenuProps,
  BurgerMenuPropsSchema,
  //
  Root as BurgerMenu,
};

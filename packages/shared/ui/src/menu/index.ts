/**
 * Barrel re-export for the menu component — exposes the
 * Menu Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type MenuProps, MenuPropsSchema } from './Menu.svelte';

export {
  Root,
  type MenuProps,
  MenuPropsSchema,
  //
  Root as Menu,
};

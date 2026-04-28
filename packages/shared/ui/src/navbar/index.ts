/**
 * Barrel re-export for the navbar component — exposes the
 * Navbar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type NavbarProps, NavbarPropsSchema } from './Navbar.svelte';

export {
  Root,
  type NavbarProps,
  NavbarPropsSchema,
  //
  Root as Navbar,
};

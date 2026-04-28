/**
 * Barrel re-export for the nav-link component — exposes the
 * NavLink Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type NavLinkProps, NavLinkPropsSchema } from './NavLink.svelte';

export {
  Root,
  type NavLinkProps,
  NavLinkPropsSchema,
  //
  Root as NavLink,
};

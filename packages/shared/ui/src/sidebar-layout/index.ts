/**
 * Barrel re-export for the sidebar-layout component —
 * exposes the SidebarLayout Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SidebarLayoutProps, SidebarLayoutPropsSchema } from './SidebarLayout.svelte';

export {
  Root,
  type SidebarLayoutProps,
  SidebarLayoutPropsSchema,
  //
  Root as SidebarLayout,
};

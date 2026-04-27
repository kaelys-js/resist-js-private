/**
 * Barrel re-export for the admin-layout component — exposes the
 * `AdminLayout` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AdminLayoutProps, AdminLayoutPropsSchema } from './AdminLayout.svelte';

export {
  Root,
  type AdminLayoutProps,
  AdminLayoutPropsSchema,
  //
  Root as AdminLayout,
};

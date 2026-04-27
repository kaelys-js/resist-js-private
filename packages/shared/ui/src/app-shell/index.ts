/**
 * Barrel re-export for the app-shell component — exposes the
 * `AppShell` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AppShellProps, AppShellPropsSchema } from './AppShell.svelte';

export {
  Root,
  type AppShellProps,
  AppShellPropsSchema,
  //
  Root as AppShell,
};

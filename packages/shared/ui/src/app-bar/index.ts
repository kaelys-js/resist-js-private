/**
 * Barrel re-export for the app-bar component — exposes the
 * `AppBar` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AppBarProps, AppBarPropsSchema } from './AppBar.svelte';

export {
  Root,
  type AppBarProps,
  AppBarPropsSchema,
  //
  Root as AppBar,
};

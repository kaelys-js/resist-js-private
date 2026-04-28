/**
 * Barrel re-export for the dock-manager component — exposes the
 * `DockManager` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DockManagerProps, DockManagerPropsSchema } from './DockManager.svelte';

export {
  Root,
  type DockManagerProps,
  DockManagerPropsSchema,
  //
  Root as DockManager,
};

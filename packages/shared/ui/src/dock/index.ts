/**
 * Barrel re-export for the dock component — exposes the `Dock`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type DockProps, DockPropsSchema } from './Dock.svelte';

export {
  Root,
  type DockProps,
  DockPropsSchema,
  //
  Root as Dock,
};

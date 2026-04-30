/**
 * Barrel re-export for the toolbar component — exposes the
 * Toolbar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ToolbarProps, ToolbarPropsSchema } from './Toolbar.svelte';

export {
  Root,
  type ToolbarProps,
  ToolbarPropsSchema,
  //
  Root as Toolbar,
};

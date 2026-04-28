/**
 * Barrel re-export for the panel-menu component — exposes
 * the PanelMenu Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PanelMenuProps, PanelMenuPropsSchema } from './PanelMenu.svelte';

export {
  Root,
  type PanelMenuProps,
  PanelMenuPropsSchema,
  //
  Root as PanelMenu,
};

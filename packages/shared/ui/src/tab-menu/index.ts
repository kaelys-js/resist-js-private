/**
 * Barrel re-export for the tab-menu component — exposes the
 * TabMenu Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TabMenuProps, TabMenuPropsSchema } from './TabMenu.svelte';

export {
  Root,
  type TabMenuProps,
  TabMenuPropsSchema,
  //
  Root as TabMenu,
};

/**
 * Barrel re-export for the overflow-menu component — exposes
 * the OverflowMenu Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OverflowMenuProps, OverflowMenuPropsSchema } from './OverflowMenu.svelte';

export {
  Root,
  type OverflowMenuProps,
  OverflowMenuPropsSchema,
  //
  Root as OverflowMenu,
};

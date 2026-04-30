/**
 * Barrel re-export for the vaul-drawer component — exposes
 * the VaulDrawer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type VaulDrawerProps, VaulDrawerPropsSchema } from './VaulDrawer.svelte';

export {
  Root,
  type VaulDrawerProps,
  VaulDrawerPropsSchema,
  //
  Root as VaulDrawer,
};

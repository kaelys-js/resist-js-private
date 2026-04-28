/**
 * Barrel re-export for the grid-layout component — exposes the
 * GridLayout Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GridLayoutProps, GridLayoutPropsSchema } from './GridLayout.svelte';

export {
  Root,
  type GridLayoutProps,
  GridLayoutPropsSchema,
  //
  Root as GridLayout,
};

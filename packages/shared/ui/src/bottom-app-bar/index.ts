/**
 * Barrel re-export for the bottom-app-bar component — exposes
 * the `BottomAppBar` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BottomAppBarProps, BottomAppBarPropsSchema } from './BottomAppBar.svelte';

export {
  Root,
  type BottomAppBarProps,
  BottomAppBarPropsSchema,
  //
  Root as BottomAppBar,
};

/**
 * Barrel re-export for the title-bar component — exposes
 * the TitleBar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TitleBarProps, TitleBarPropsSchema } from './TitleBar.svelte';

export {
  Root,
  type TitleBarProps,
  TitleBarPropsSchema,
  //
  Root as TitleBar,
};

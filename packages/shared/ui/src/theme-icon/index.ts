/**
 * Barrel re-export for the theme-icon component — exposes
 * the ThemeIcon Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ThemeIconProps, ThemeIconPropsSchema } from './ThemeIcon.svelte';

export {
  Root,
  type ThemeIconProps,
  ThemeIconPropsSchema,
  //
  Root as ThemeIcon,
};

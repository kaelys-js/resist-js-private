/**
 * Barrel re-export for the theme-controller component —
 * exposes the ThemeController Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ThemeControllerProps,
  ThemeControllerPropsSchema,
} from './ThemeController.svelte';

export {
  Root,
  type ThemeControllerProps,
  ThemeControllerPropsSchema,
  //
  Root as ThemeController,
};

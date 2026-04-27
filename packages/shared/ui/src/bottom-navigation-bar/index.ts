/**
 * Barrel re-export for the bottom-navigation-bar component —
 * exposes the `BottomNavigationBar` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BottomNavigationBarProps,
  BottomNavigationBarPropsSchema,
} from './BottomNavigationBar.svelte';

export {
  Root,
  type BottomNavigationBarProps,
  BottomNavigationBarPropsSchema,
  //
  Root as BottomNavigationBar,
};

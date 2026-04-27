/**
 * Barrel re-export for the bottom-navigation component — exposes
 * the `BottomNavigation` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BottomNavigationProps,
  BottomNavigationPropsSchema,
} from './BottomNavigation.svelte';

export {
  Root,
  type BottomNavigationProps,
  BottomNavigationPropsSchema,
  //
  Root as BottomNavigation,
};

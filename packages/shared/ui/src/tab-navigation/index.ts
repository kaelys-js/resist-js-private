/**
 * Barrel re-export for the tab-navigation component —
 * exposes the TabNavigation Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TabNavigationProps, TabNavigationPropsSchema } from './TabNavigation.svelte';

export {
  Root,
  type TabNavigationProps,
  TabNavigationPropsSchema,
  //
  Root as TabNavigation,
};

/**
 * Barrel re-export for the navigation-rail component —
 * exposes the NavigationRail Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type NavigationRailProps, NavigationRailPropsSchema } from './NavigationRail.svelte';

export {
  Root,
  type NavigationRailProps,
  NavigationRailPropsSchema,
  //
  Root as NavigationRail,
};

/**
 * Barrel re-export for the anchor-navigation component — exposes
 * the `AnchorNavigation` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AnchorNavigationProps,
  AnchorNavigationPropsSchema,
} from './AnchorNavigation.svelte';

export {
  Root,
  type AnchorNavigationProps,
  AnchorNavigationPropsSchema,
  //
  Root as AnchorNavigation,
};

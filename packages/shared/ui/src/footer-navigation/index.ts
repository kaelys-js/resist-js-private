/**
 * Barrel re-export for the footer-navigation component —
 * exposes the FooterNavigation Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type FooterNavigationProps,
  FooterNavigationPropsSchema,
} from './FooterNavigation.svelte';

export {
  Root,
  type FooterNavigationProps,
  FooterNavigationPropsSchema,
  //
  Root as FooterNavigation,
};

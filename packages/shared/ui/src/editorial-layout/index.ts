/**
 * Barrel re-export for the editorial-layout component — exposes
 * the EditorialLayout Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, {
  type EditorialLayoutProps,
  EditorialLayoutPropsSchema,
} from './EditorialLayout.svelte';

export {
  Root,
  type EditorialLayoutProps,
  EditorialLayoutPropsSchema,
  //
  Root as EditorialLayout,
};

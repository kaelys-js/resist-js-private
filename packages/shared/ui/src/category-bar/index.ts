/**
 * Barrel re-export for the category-bar component — exposes the
 * `CategoryBar` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CategoryBarProps, CategoryBarPropsSchema } from './CategoryBar.svelte';

export {
  Root,
  type CategoryBarProps,
  CategoryBarPropsSchema,
  //
  Root as CategoryBar,
};

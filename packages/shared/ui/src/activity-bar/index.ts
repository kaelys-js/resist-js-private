/**
 * Barrel re-export for the activity-bar component — exposes the
 * `ActivityBar` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ActivityBarProps, ActivityBarPropsSchema } from './ActivityBar.svelte';

export {
  Root,
  type ActivityBarProps,
  ActivityBarPropsSchema,
  //
  Root as ActivityBar,
};

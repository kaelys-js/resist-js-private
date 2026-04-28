/**
 * Barrel re-export for the path-bar component — exposes the
 * PathBar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PathBarProps, PathBarPropsSchema } from './PathBar.svelte';

export {
  Root,
  type PathBarProps,
  PathBarPropsSchema,
  //
  Root as PathBar,
};

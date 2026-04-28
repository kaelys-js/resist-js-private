/**
 * Barrel re-export for the skip-nav component — exposes the
 * SkipNav Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SkipNavProps, SkipNavPropsSchema } from './SkipNav.svelte';

export {
  Root,
  type SkipNavProps,
  SkipNavPropsSchema,
  //
  Root as SkipNav,
};

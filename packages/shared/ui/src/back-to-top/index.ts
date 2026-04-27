/**
 * Barrel re-export for the back-to-top component — exposes the
 * `BackToTop` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BackToTopProps, BackToTopPropsSchema } from './BackToTop.svelte';

export {
  Root,
  type BackToTopProps,
  BackToTopPropsSchema,
  //
  Root as BackToTop,
};

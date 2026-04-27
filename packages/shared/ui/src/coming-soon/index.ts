/**
 * Barrel re-export for the coming-soon component — exposes the
 * `ComingSoon` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ComingSoonProps, ComingSoonPropsSchema } from './ComingSoon.svelte';

export {
  Root,
  type ComingSoonProps,
  ComingSoonPropsSchema,
  //
  Root as ComingSoon,
};

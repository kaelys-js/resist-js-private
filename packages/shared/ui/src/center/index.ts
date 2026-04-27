/**
 * Barrel re-export for the center component — exposes the
 * `Center` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CenterProps, CenterPropsSchema } from './Center.svelte';

export {
  Root,
  type CenterProps,
  CenterPropsSchema,
  //
  Root as Center,
};

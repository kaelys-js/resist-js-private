/**
 * Barrel re-export for the inplace component — exposes the
 * Inplace Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type InplaceProps, InplacePropsSchema } from './Inplace.svelte';

export {
  Root,
  type InplaceProps,
  InplacePropsSchema,
  //
  Root as Inplace,
};

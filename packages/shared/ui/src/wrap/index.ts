/**
 * Barrel re-export for the wrap component — exposes the
 * Wrap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type WrapProps, WrapPropsSchema } from './Wrap.svelte';

export {
  Root,
  type WrapProps,
  WrapPropsSchema,
  //
  Root as Wrap,
};

/**
 * Barrel re-export for the truncate component — exposes the
 * Truncate Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TruncateProps, TruncatePropsSchema } from './Truncate.svelte';

export {
  Root,
  type TruncateProps,
  TruncatePropsSchema,
  //
  Root as Truncate,
};

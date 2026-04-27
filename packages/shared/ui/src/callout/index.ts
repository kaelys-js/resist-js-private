/**
 * Barrel re-export for the callout component — exposes the
 * `Callout` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CalloutProps, CalloutPropsSchema } from './Callout.svelte';

export {
  Root,
  type CalloutProps,
  CalloutPropsSchema,
  //
  Root as Callout,
};

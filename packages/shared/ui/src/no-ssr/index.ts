/**
 * Barrel re-export for the no-ssr component — exposes the
 * NoSsr Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type NoSsrProps, NoSsrPropsSchema } from './NoSsr.svelte';

export {
  Root,
  type NoSsrProps,
  NoSsrPropsSchema,
  //
  Root as NoSsr,
};

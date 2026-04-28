/**
 * Barrel re-export for the sonner component — exposes the
 * Sonner Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SonnerProps, SonnerPropsSchema } from './Sonner.svelte';

export {
  Root,
  type SonnerProps,
  SonnerPropsSchema,
  //
  Root as Sonner,
};

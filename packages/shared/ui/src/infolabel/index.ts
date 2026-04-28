/**
 * Barrel re-export for the infolabel component — exposes the
 * Infolabel Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type InfolabelProps, InfolabelPropsSchema } from './Infolabel.svelte';

export {
  Root,
  type InfolabelProps,
  InfolabelPropsSchema,
  //
  Root as Infolabel,
};

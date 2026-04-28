/**
 * Barrel re-export for the inset component — exposes the
 * Inset Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type InsetProps, InsetPropsSchema } from './Inset.svelte';

export {
  Root,
  type InsetProps,
  InsetPropsSchema,
  //
  Root as Inset,
};

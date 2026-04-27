/**
 * Barrel re-export for the bleed component — exposes the `Bleed`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type BleedProps, BleedPropsSchema } from './Bleed.svelte';

export {
  Root,
  type BleedProps,
  BleedPropsSchema,
  //
  Root as Bleed,
};

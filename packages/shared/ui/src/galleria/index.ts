/**
 * Barrel re-export for the galleria component — exposes the
 * Galleria Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GalleriaProps, GalleriaPropsSchema } from './Galleria.svelte';

export {
  Root,
  type GalleriaProps,
  GalleriaPropsSchema,
  //
  Root as Galleria,
};

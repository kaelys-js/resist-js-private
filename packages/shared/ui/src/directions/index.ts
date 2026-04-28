/**
 * Barrel re-export for the directions component — exposes the
 * `Directions` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DirectionsProps, DirectionsPropsSchema } from './Directions.svelte';

export {
  Root,
  type DirectionsProps,
  DirectionsPropsSchema,
  //
  Root as Directions,
};

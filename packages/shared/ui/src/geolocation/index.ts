/**
 * Barrel re-export for the geolocation component — exposes
 * the Geolocation Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GeolocationProps, GeolocationPropsSchema } from './Geolocation.svelte';

export {
  Root,
  type GeolocationProps,
  GeolocationPropsSchema,
  //
  Root as Geolocation,
};

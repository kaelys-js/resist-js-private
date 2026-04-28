/**
 * Barrel re-export for the map-marker component — exposes
 * the MapMarker Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MapMarkerProps, MapMarkerPropsSchema } from './MapMarker.svelte';

export {
  Root,
  type MapMarkerProps,
  MapMarkerPropsSchema,
  //
  Root as MapMarker,
};

/**
 * Barrel re-export for the map-view component — exposes the
 * MapView Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MapViewProps, MapViewPropsSchema } from './MapView.svelte';

export {
  Root,
  type MapViewProps,
  MapViewPropsSchema,
  //
  Root as MapView,
};

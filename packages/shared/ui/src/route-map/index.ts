/**
 * Barrel re-export for the route-map component — exposes
 * the RouteMap Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RouteMapProps, RouteMapPropsSchema } from './RouteMap.svelte';

export {
  Root,
  type RouteMapProps,
  RouteMapPropsSchema,
  //
  Root as RouteMap,
};

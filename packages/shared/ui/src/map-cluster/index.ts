/**
 * Barrel re-export for the map-cluster component — exposes
 * the MapCluster Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MapClusterProps, MapClusterPropsSchema } from './MapCluster.svelte';

export {
  Root,
  type MapClusterProps,
  MapClusterPropsSchema,
  //
  Root as MapCluster,
};

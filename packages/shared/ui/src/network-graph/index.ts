/**
 * Barrel re-export for the network-graph component — exposes
 * the NetworkGraph Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type NetworkGraphProps, NetworkGraphPropsSchema } from './NetworkGraph.svelte';

export {
  Root,
  type NetworkGraphProps,
  NetworkGraphPropsSchema,
  //
  Root as NetworkGraph,
};

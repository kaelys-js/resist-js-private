/**
 * Barrel re-export for the network-status component — exposes
 * the NetworkStatus Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type NetworkStatusProps, NetworkStatusPropsSchema } from './NetworkStatus.svelte';

export {
  Root,
  type NetworkStatusProps,
  NetworkStatusPropsSchema,
  //
  Root as NetworkStatus,
};

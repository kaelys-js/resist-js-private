/**
 * Barrel re-export for the network-inspector component —
 * exposes the NetworkInspector Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NetworkInspectorProps,
  NetworkInspectorPropsSchema,
} from './NetworkInspector.svelte';

export {
  Root,
  type NetworkInspectorProps,
  NetworkInspectorPropsSchema,
  //
  Root as NetworkInspector,
};

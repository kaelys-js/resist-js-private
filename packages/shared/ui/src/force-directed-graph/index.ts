/**
 * Barrel re-export for the force-directed-graph component —
 * exposes the ForceDirectedGraph Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ForceDirectedGraphProps,
  ForceDirectedGraphPropsSchema,
} from './ForceDirectedGraph.svelte';

export {
  Root,
  type ForceDirectedGraphProps,
  ForceDirectedGraphPropsSchema,
  //
  Root as ForceDirectedGraph,
};

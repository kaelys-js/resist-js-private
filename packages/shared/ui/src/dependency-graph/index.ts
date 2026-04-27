/**
 * Barrel re-export for the dependency-graph component — exposes
 * the `DependencyGraph` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DependencyGraphProps,
  DependencyGraphPropsSchema,
} from './DependencyGraph.svelte';

export {
  Root,
  type DependencyGraphProps,
  DependencyGraphPropsSchema,
  //
  Root as DependencyGraph,
};

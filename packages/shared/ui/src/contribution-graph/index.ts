/**
 * Barrel re-export for the contribution-graph component —
 * exposes the `ContributionGraph` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ContributionGraphProps,
  ContributionGraphPropsSchema,
} from './ContributionGraph.svelte';

export {
  Root,
  type ContributionGraphProps,
  ContributionGraphPropsSchema,
  //
  Root as ContributionGraph,
};

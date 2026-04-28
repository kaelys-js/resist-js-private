/**
 * Barrel re-export for the git-graph component — exposes the
 * GitGraph Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GitGraphProps, GitGraphPropsSchema } from './GitGraph.svelte';

export {
  Root,
  type GitGraphProps,
  GitGraphPropsSchema,
  //
  Root as GitGraph,
};

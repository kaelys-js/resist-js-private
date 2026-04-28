/**
 * Barrel re-export for the pull-request-card component —
 * exposes the PullRequestCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PullRequestCardProps,
  PullRequestCardPropsSchema,
} from './PullRequestCard.svelte';

export {
  Root,
  type PullRequestCardProps,
  PullRequestCardPropsSchema,
  //
  Root as PullRequestCard,
};

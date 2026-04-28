/**
 * Barrel re-export for the issue-card component — exposes the
 * IssueCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type IssueCardProps, IssueCardPropsSchema } from './IssueCard.svelte';

export {
  Root,
  type IssueCardProps,
  IssueCardPropsSchema,
  //
  Root as IssueCard,
};

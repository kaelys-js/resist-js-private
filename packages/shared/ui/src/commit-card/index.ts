/**
 * Barrel re-export for the commit-card component — exposes the
 * `CommitCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CommitCardProps, CommitCardPropsSchema } from './CommitCard.svelte';

export {
  Root,
  type CommitCardProps,
  CommitCardPropsSchema,
  //
  Root as CommitCard,
};

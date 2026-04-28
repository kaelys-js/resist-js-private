/**
 * Barrel re-export for the empty-state component — exposes the
 * EmptyState Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type EmptyStateProps, EmptyStatePropsSchema } from './EmptyState.svelte';

export {
  Root,
  type EmptyStateProps,
  EmptyStatePropsSchema,
  //
  Root as EmptyState,
};

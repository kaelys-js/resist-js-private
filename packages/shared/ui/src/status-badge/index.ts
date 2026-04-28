/**
 * Barrel re-export for the status-badge component — exposes
 * the StatusBadge Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StatusBadgeProps, StatusBadgePropsSchema } from './StatusBadge.svelte';

export {
  Root,
  type StatusBadgeProps,
  StatusBadgePropsSchema,
  //
  Root as StatusBadge,
};

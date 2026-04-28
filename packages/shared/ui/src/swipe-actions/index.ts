/**
 * Barrel re-export for the swipe-actions component — exposes
 * the SwipeActions Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type SwipeActionsProps, SwipeActionsPropsSchema } from './SwipeActions.svelte';

export {
  Root,
  type SwipeActionsProps,
  SwipeActionsPropsSchema,
  //
  Root as SwipeActions,
};

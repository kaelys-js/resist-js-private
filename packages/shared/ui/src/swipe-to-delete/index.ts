/**
 * Barrel re-export for the swipe-to-delete component —
 * exposes the SwipeToDelete Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SwipeToDeleteProps, SwipeToDeletePropsSchema } from './SwipeToDelete.svelte';

export {
  Root,
  type SwipeToDeleteProps,
  SwipeToDeletePropsSchema,
  //
  Root as SwipeToDelete,
};

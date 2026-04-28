/**
 * Barrel re-export for the swipeable-card component —
 * exposes the SwipeableCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SwipeableCardProps, SwipeableCardPropsSchema } from './SwipeableCard.svelte';

export {
  Root,
  type SwipeableCardProps,
  SwipeableCardPropsSchema,
  //
  Root as SwipeableCard,
};

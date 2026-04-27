/**
 * Barrel re-export for the animated-card component — exposes the
 * `AnimatedCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AnimatedCardProps, AnimatedCardPropsSchema } from './AnimatedCard.svelte';

export {
  Root,
  type AnimatedCardProps,
  AnimatedCardPropsSchema,
  //
  Root as AnimatedCard,
};

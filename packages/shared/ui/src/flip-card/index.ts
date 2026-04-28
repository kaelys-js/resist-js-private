/**
 * Barrel re-export for the flip-card component — exposes the
 * FlipCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FlipCardProps, FlipCardPropsSchema } from './FlipCard.svelte';

export {
  Root,
  type FlipCardProps,
  FlipCardPropsSchema,
  //
  Root as FlipCard,
};

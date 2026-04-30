/**
 * Barrel re-export for the wobble-card component — exposes
 * the WobbleCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WobbleCardProps, WobbleCardPropsSchema } from './WobbleCard.svelte';

export {
  Root,
  type WobbleCardProps,
  WobbleCardPropsSchema,
  //
  Root as WobbleCard,
};

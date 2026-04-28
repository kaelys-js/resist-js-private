/**
 * Barrel re-export for the ring-progress component — exposes
 * the RingProgress Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RingProgressProps, RingProgressPropsSchema } from './RingProgress.svelte';

export {
  Root,
  type RingProgressProps,
  RingProgressPropsSchema,
  //
  Root as RingProgress,
};

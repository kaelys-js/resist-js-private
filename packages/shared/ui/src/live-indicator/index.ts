/**
 * Barrel re-export for the live-indicator component — exposes
 * the LiveIndicator Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LiveIndicatorProps, LiveIndicatorPropsSchema } from './LiveIndicator.svelte';

export {
  Root,
  type LiveIndicatorProps,
  LiveIndicatorPropsSchema,
  //
  Root as LiveIndicator,
};

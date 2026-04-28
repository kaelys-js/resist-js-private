/**
 * Barrel re-export for the live-region component — exposes
 * the LiveRegion Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LiveRegionProps, LiveRegionPropsSchema } from './LiveRegion.svelte';

export {
  Root,
  type LiveRegionProps,
  LiveRegionPropsSchema,
  //
  Root as LiveRegion,
};

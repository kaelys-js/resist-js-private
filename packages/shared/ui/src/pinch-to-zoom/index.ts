/**
 * Barrel re-export for the pinch-to-zoom component — exposes
 * the PinchToZoom Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PinchToZoomProps, PinchToZoomPropsSchema } from './PinchToZoom.svelte';

export {
  Root,
  type PinchToZoomProps,
  PinchToZoomPropsSchema,
  //
  Root as PinchToZoom,
};

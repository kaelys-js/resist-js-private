/**
 * Barrel re-export for the loading-overlay component — exposes
 * the LoadingOverlay Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LoadingOverlayProps, LoadingOverlayPropsSchema } from './LoadingOverlay.svelte';

export {
  Root,
  type LoadingOverlayProps,
  LoadingOverlayPropsSchema,
  //
  Root as LoadingOverlay,
};

/**
 * Barrel re-export for the three-d-viewer component — exposes
 * the ThreeDViewer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ThreeDViewerProps, ThreeDViewerPropsSchema } from './ThreeDViewer.svelte';

export {
  Root,
  type ThreeDViewerProps,
  ThreeDViewerPropsSchema,
  //
  Root as ThreeDViewer,
};

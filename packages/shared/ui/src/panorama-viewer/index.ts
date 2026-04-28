/**
 * Barrel re-export for the panorama-viewer component —
 * exposes the PanoramaViewer Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type PanoramaViewerProps, PanoramaViewerPropsSchema } from './PanoramaViewer.svelte';

export {
  Root,
  type PanoramaViewerProps,
  PanoramaViewerPropsSchema,
  //
  Root as PanoramaViewer,
};

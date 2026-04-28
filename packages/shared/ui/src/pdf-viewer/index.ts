/**
 * Barrel re-export for the pdf-viewer component — exposes
 * the PdfViewer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PdfViewerProps, PdfViewerPropsSchema } from './PdfViewer.svelte';

export {
  Root,
  type PdfViewerProps,
  PdfViewerPropsSchema,
  //
  Root as PdfViewer,
};

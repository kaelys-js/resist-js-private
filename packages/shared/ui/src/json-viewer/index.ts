/**
 * Barrel re-export for the json-viewer component — exposes
 * the JsonViewer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type JsonViewerProps, JsonViewerPropsSchema } from './JsonViewer.svelte';

export {
  Root,
  type JsonViewerProps,
  JsonViewerPropsSchema,
  //
  Root as JsonViewer,
};

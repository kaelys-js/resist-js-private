/**
 * Barrel re-export for the schema-viewer component — exposes
 * the SchemaViewer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SchemaViewerProps, SchemaViewerPropsSchema } from './SchemaViewer.svelte';

export {
  Root,
  type SchemaViewerProps,
  SchemaViewerPropsSchema,
  //
  Root as SchemaViewer,
};

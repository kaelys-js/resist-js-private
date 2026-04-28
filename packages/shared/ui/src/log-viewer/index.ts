/**
 * Barrel re-export for the log-viewer component — exposes the
 * LogViewer Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LogViewerProps, LogViewerPropsSchema } from './LogViewer.svelte';

export {
  Root,
  type LogViewerProps,
  LogViewerPropsSchema,
  //
  Root as LogViewer,
};

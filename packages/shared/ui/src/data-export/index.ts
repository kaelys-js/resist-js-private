/**
 * Barrel re-export for the data-export component — exposes the
 * `DataExport` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DataExportProps, DataExportPropsSchema } from './DataExport.svelte';

export {
  Root,
  type DataExportProps,
  DataExportPropsSchema,
  //
  Root as DataExport,
};

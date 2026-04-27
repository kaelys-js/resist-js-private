/**
 * Barrel re-export for the data-grid component — exposes the
 * `DataGrid` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DataGridProps, DataGridPropsSchema } from './DataGrid.svelte';

export {
  Root,
  type DataGridProps,
  DataGridPropsSchema,
  //
  Root as DataGrid,
};

/**
 * Barrel re-export for the data-view component — exposes the
 * `DataView` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DataViewProps, DataViewPropsSchema } from './DataView.svelte';

export {
  Root,
  type DataViewProps,
  DataViewPropsSchema,
  //
  Root as DataView,
};

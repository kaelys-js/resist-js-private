/**
 * Barrel re-export for the data-list component — exposes the
 * `DataList` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DataListProps, DataListPropsSchema } from './DataList.svelte';

export {
  Root,
  type DataListProps,
  DataListPropsSchema,
  //
  Root as DataList,
};

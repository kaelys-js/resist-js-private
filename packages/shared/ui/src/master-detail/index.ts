/**
 * Barrel re-export for the master-detail component — exposes
 * the MasterDetail Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MasterDetailProps, MasterDetailPropsSchema } from './MasterDetail.svelte';

export {
  Root,
  type MasterDetailProps,
  MasterDetailPropsSchema,
  //
  Root as MasterDetail,
};

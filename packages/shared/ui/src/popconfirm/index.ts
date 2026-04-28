/**
 * Barrel re-export for the popconfirm component — exposes
 * the Popconfirm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PopconfirmProps, PopconfirmPropsSchema } from './Popconfirm.svelte';

export {
  Root,
  type PopconfirmProps,
  PopconfirmPropsSchema,
  //
  Root as Popconfirm,
};

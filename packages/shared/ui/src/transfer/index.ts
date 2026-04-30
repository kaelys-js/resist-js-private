/**
 * Barrel re-export for the transfer component — exposes the
 * Transfer Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TransferProps, TransferPropsSchema } from './Transfer.svelte';

export {
  Root,
  type TransferProps,
  TransferPropsSchema,
  //
  Root as Transfer,
};

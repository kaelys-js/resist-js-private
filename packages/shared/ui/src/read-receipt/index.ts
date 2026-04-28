/**
 * Barrel re-export for the read-receipt component — exposes
 * the ReadReceipt Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ReadReceiptProps, ReadReceiptPropsSchema } from './ReadReceipt.svelte';

export {
  Root,
  type ReadReceiptProps,
  ReadReceiptPropsSchema,
  //
  Root as ReadReceipt,
};

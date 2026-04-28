/**
 * Barrel re-export for the receipt component — exposes the
 * Receipt Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ReceiptProps, ReceiptPropsSchema } from './Receipt.svelte';

export {
  Root,
  type ReceiptProps,
  ReceiptPropsSchema,
  //
  Root as Receipt,
};

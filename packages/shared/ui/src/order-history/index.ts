/**
 * Barrel re-export for the order-history component — exposes
 * the OrderHistory Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OrderHistoryProps, OrderHistoryPropsSchema } from './OrderHistory.svelte';

export {
  Root,
  type OrderHistoryProps,
  OrderHistoryPropsSchema,
  //
  Root as OrderHistory,
};

/**
 * Barrel re-export for the order-list component — exposes
 * the OrderList Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OrderListProps, OrderListPropsSchema } from './OrderList.svelte';

export {
  Root,
  type OrderListProps,
  OrderListPropsSchema,
  //
  Root as OrderList,
};

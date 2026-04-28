/**
 * Barrel re-export for the order-status component — exposes
 * the OrderStatus Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OrderStatusProps, OrderStatusPropsSchema } from './OrderStatus.svelte';

export {
  Root,
  type OrderStatusProps,
  OrderStatusPropsSchema,
  //
  Root as OrderStatus,
};

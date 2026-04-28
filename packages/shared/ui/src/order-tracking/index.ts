/**
 * Barrel re-export for the order-tracking component — exposes
 * the OrderTracking Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OrderTrackingProps, OrderTrackingPropsSchema } from './OrderTracking.svelte';

export {
  Root,
  type OrderTrackingProps,
  OrderTrackingPropsSchema,
  //
  Root as OrderTracking,
};

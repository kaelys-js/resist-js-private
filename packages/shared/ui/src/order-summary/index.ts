/**
 * Barrel re-export for the order-summary component — exposes
 * the OrderSummary Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OrderSummaryProps, OrderSummaryPropsSchema } from './OrderSummary.svelte';

export {
  Root,
  type OrderSummaryProps,
  OrderSummaryPropsSchema,
  //
  Root as OrderSummary,
};

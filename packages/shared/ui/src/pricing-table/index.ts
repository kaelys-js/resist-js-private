/**
 * Barrel re-export for the pricing-table component — exposes
 * the PricingTable Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PricingTableProps, PricingTablePropsSchema } from './PricingTable.svelte';

export {
  Root,
  type PricingTableProps,
  PricingTablePropsSchema,
  //
  Root as PricingTable,
};

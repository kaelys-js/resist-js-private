/**
 * Barrel re-export for the billing-history component — exposes
 * the `BillingHistory` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type BillingHistoryProps, BillingHistoryPropsSchema } from './BillingHistory.svelte';

export {
  Root,
  type BillingHistoryProps,
  BillingHistoryPropsSchema,
  //
  Root as BillingHistory,
};

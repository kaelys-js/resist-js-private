/**
 * Barrel re-export for the budget-tracker component — exposes
 * the `BudgetTracker` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BudgetTrackerProps, BudgetTrackerPropsSchema } from './BudgetTracker.svelte';

export {
  Root,
  type BudgetTrackerProps,
  BudgetTrackerPropsSchema,
  //
  Root as BudgetTracker,
};

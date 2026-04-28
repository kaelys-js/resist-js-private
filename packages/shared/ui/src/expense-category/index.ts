/**
 * Barrel re-export for the expense-category component —
 * exposes the ExpenseCategory Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ExpenseCategoryProps,
  ExpenseCategoryPropsSchema,
} from './ExpenseCategory.svelte';

export {
  Root,
  type ExpenseCategoryProps,
  ExpenseCategoryPropsSchema,
  //
  Root as ExpenseCategory,
};

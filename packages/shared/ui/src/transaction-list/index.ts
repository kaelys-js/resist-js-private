/**
 * Barrel re-export for the transaction-list component —
 * exposes the TransactionList Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TransactionListProps,
  TransactionListPropsSchema,
} from './TransactionList.svelte';

export {
  Root,
  type TransactionListProps,
  TransactionListPropsSchema,
  //
  Root as TransactionList,
};

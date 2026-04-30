/**
 * Barrel re-export for the transaction-detail component —
 * exposes the TransactionDetail Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TransactionDetailProps,
  TransactionDetailPropsSchema,
} from './TransactionDetail.svelte';

export {
  Root,
  type TransactionDetailProps,
  TransactionDetailPropsSchema,
  //
  Root as TransactionDetail,
};

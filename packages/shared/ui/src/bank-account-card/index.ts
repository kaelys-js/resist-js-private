/**
 * Barrel re-export for the bank-account-card component — exposes
 * the `BankAccountCard` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BankAccountCardProps,
  BankAccountCardPropsSchema,
} from './BankAccountCard.svelte';

export {
  Root,
  type BankAccountCardProps,
  BankAccountCardPropsSchema,
  //
  Root as BankAccountCard,
};

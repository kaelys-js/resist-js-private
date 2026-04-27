/**
 * Barrel re-export for the amortization-table component — exposes
 * the `AmortizationTable` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AmortizationTableProps,
  AmortizationTablePropsSchema,
} from './AmortizationTable.svelte';

export {
  Root,
  type AmortizationTableProps,
  AmortizationTablePropsSchema,
  //
  Root as AmortizationTable,
};

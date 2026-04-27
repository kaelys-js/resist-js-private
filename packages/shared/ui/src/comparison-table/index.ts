/**
 * Barrel re-export for the comparison-table component — exposes
 * the `ComparisonTable` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ComparisonTableProps,
  ComparisonTablePropsSchema,
} from './ComparisonTable.svelte';

export {
  Root,
  type ComparisonTableProps,
  ComparisonTablePropsSchema,
  //
  Root as ComparisonTable,
};

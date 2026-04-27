/**
 * Barrel re-export for the cohort-table component — exposes the
 * `CohortTable` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CohortTableProps, CohortTablePropsSchema } from './CohortTable.svelte';

export {
  Root,
  type CohortTableProps,
  CohortTablePropsSchema,
  //
  Root as CohortTable,
};

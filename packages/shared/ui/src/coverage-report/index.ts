/**
 * Barrel re-export for the coverage-report component — exposes
 * the `CoverageReport` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type CoverageReportProps, CoverageReportPropsSchema } from './CoverageReport.svelte';

export {
  Root,
  type CoverageReportProps,
  CoverageReportPropsSchema,
  //
  Root as CoverageReport,
};

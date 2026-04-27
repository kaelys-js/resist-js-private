/**
 * Barrel re-export for the bug-report-form component — exposes
 * the `BugReportForm` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BugReportFormProps, BugReportFormPropsSchema } from './BugReportForm.svelte';

export {
  Root,
  type BugReportFormProps,
  BugReportFormPropsSchema,
  //
  Root as BugReportForm,
};

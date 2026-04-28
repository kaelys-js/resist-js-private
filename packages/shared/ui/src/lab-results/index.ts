/**
 * Barrel re-export for the lab-results component — exposes
 * the LabResults Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LabResultsProps, LabResultsPropsSchema } from './LabResults.svelte';

export {
  Root,
  type LabResultsProps,
  LabResultsPropsSchema,
  //
  Root as LabResults,
};

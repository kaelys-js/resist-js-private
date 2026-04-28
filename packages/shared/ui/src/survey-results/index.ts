/**
 * Barrel re-export for the survey-results component —
 * exposes the SurveyResults Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SurveyResultsProps, SurveyResultsPropsSchema } from './SurveyResults.svelte';

export {
  Root,
  type SurveyResultsProps,
  SurveyResultsPropsSchema,
  //
  Root as SurveyResults,
};

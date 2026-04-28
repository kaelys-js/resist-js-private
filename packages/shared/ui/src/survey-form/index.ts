/**
 * Barrel re-export for the survey-form component — exposes
 * the SurveyForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SurveyFormProps, SurveyFormPropsSchema } from './SurveyForm.svelte';

export {
  Root,
  type SurveyFormProps,
  SurveyFormPropsSchema,
  //
  Root as SurveyForm,
};

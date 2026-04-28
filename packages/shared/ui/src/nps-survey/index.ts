/**
 * Barrel re-export for the nps-survey component — exposes
 * the NpsSurvey Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type NpsSurveyProps, NpsSurveyPropsSchema } from './NpsSurvey.svelte';

export {
  Root,
  type NpsSurveyProps,
  NpsSurveyPropsSchema,
  //
  Root as NpsSurvey,
};

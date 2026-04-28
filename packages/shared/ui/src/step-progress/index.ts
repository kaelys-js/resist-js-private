/**
 * Barrel re-export for the step-progress component — exposes
 * the StepProgress Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StepProgressProps, StepProgressPropsSchema } from './StepProgress.svelte';

export {
  Root,
  type StepProgressProps,
  StepProgressPropsSchema,
  //
  Root as StepProgress,
};

/**
 * Barrel re-export for the multi-step-form component —
 * exposes the MultiStepForm Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type MultiStepFormProps, MultiStepFormPropsSchema } from './MultiStepForm.svelte';

export {
  Root,
  type MultiStepFormProps,
  MultiStepFormPropsSchema,
  //
  Root as MultiStepForm,
};

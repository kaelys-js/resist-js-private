/**
 * Barrel re-export for the stepper component — exposes the
 * Stepper Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type StepperProps, StepperPropsSchema } from './Stepper.svelte';

export {
  Root,
  type StepperProps,
  StepperPropsSchema,
  //
  Root as Stepper,
};

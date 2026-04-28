/**
 * Barrel re-export for the mobile-stepper component — exposes
 * the MobileStepper Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MobileStepperProps, MobileStepperPropsSchema } from './MobileStepper.svelte';

export {
  Root,
  type MobileStepperProps,
  MobileStepperPropsSchema,
  //
  Root as MobileStepper,
};

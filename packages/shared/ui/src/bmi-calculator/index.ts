/**
 * Barrel re-export for the bmi-calculator component — exposes
 * the `BmiCalculator` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BmiCalculatorProps, BmiCalculatorPropsSchema } from './BmiCalculator.svelte';

export {
  Root,
  type BmiCalculatorProps,
  BmiCalculatorPropsSchema,
  //
  Root as BmiCalculator,
};

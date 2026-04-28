/**
 * Barrel re-export for the roi-calculator component —
 * exposes the RoiCalculator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type RoiCalculatorProps, RoiCalculatorPropsSchema } from './RoiCalculator.svelte';

export {
  Root,
  type RoiCalculatorProps,
  RoiCalculatorPropsSchema,
  //
  Root as RoiCalculator,
};

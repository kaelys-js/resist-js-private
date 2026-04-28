/**
 * Barrel re-export for the dosage-calculator component — exposes
 * the `DosageCalculator` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DosageCalculatorProps,
  DosageCalculatorPropsSchema,
} from './DosageCalculator.svelte';

export {
  Root,
  type DosageCalculatorProps,
  DosageCalculatorPropsSchema,
  //
  Root as DosageCalculator,
};

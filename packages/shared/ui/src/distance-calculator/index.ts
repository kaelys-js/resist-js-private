/**
 * Barrel re-export for the distance-calculator component —
 * exposes the `DistanceCalculator` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DistanceCalculatorProps,
  DistanceCalculatorPropsSchema,
} from './DistanceCalculator.svelte';

export {
  Root,
  type DistanceCalculatorProps,
  DistanceCalculatorPropsSchema,
  //
  Root as DistanceCalculator,
};

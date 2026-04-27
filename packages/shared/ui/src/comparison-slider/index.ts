/**
 * Barrel re-export for the comparison-slider component — exposes
 * the `ComparisonSlider` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ComparisonSliderProps,
  ComparisonSliderPropsSchema,
} from './ComparisonSlider.svelte';

export {
  Root,
  type ComparisonSliderProps,
  ComparisonSliderPropsSchema,
  //
  Root as ComparisonSlider,
};

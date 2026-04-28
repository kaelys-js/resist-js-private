/**
 * Barrel re-export for the dual-range-slider component —
 * exposes the DualRangeSlider Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DualRangeSliderProps,
  DualRangeSliderPropsSchema,
} from './DualRangeSlider.svelte';

export {
  Root,
  type DualRangeSliderProps,
  DualRangeSliderPropsSchema,
  //
  Root as DualRangeSlider,
};

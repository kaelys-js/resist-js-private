/**
 * Barrel re-export for the multi-slider component — exposes
 * the MultiSlider Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MultiSliderProps, MultiSliderPropsSchema } from './MultiSlider.svelte';

export {
  Root,
  type MultiSliderProps,
  MultiSliderPropsSchema,
  //
  Root as MultiSlider,
};

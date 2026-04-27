/**
 * Barrel re-export for the color-slider component — exposes the
 * `ColorSlider` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ColorSliderProps, ColorSliderPropsSchema } from './ColorSlider.svelte';

export {
  Root,
  type ColorSliderProps,
  ColorSliderPropsSchema,
  //
  Root as ColorSlider,
};

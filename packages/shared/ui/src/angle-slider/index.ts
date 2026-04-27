/**
 * Barrel re-export for the angle-slider component — exposes the
 * `AngleSlider` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AngleSliderProps, AngleSliderPropsSchema } from './AngleSlider.svelte';

export {
  Root,
  type AngleSliderProps,
  AngleSliderPropsSchema,
  //
  Root as AngleSlider,
};

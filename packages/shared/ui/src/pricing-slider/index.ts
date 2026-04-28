/**
 * Barrel re-export for the pricing-slider component — exposes
 * the PricingSlider Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PricingSliderProps, PricingSliderPropsSchema } from './PricingSlider.svelte';

export {
  Root,
  type PricingSliderProps,
  PricingSliderPropsSchema,
  //
  Root as PricingSlider,
};

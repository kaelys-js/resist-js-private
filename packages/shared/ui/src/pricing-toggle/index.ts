/**
 * Barrel re-export for the pricing-toggle component — exposes
 * the PricingToggle Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PricingToggleProps, PricingTogglePropsSchema } from './PricingToggle.svelte';

export {
  Root,
  type PricingToggleProps,
  PricingTogglePropsSchema,
  //
  Root as PricingToggle,
};

/**
 * Barrel re-export for the pricing-card component — exposes
 * the PricingCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PricingCardProps, PricingCardPropsSchema } from './PricingCard.svelte';

export {
  Root,
  type PricingCardProps,
  PricingCardPropsSchema,
  //
  Root as PricingCard,
};

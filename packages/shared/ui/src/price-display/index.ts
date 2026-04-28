/**
 * Barrel re-export for the price-display component — exposes
 * the PriceDisplay Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PriceDisplayProps, PriceDisplayPropsSchema } from './PriceDisplay.svelte';

export {
  Root,
  type PriceDisplayProps,
  PriceDisplayPropsSchema,
  //
  Root as PriceDisplay,
};

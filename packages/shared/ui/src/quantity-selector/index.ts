/**
 * Barrel re-export for the quantity-selector component —
 * exposes the QuantitySelector Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type QuantitySelectorProps,
  QuantitySelectorPropsSchema,
} from './QuantitySelector.svelte';

export {
  Root,
  type QuantitySelectorProps,
  QuantitySelectorPropsSchema,
  //
  Root as QuantitySelector,
};

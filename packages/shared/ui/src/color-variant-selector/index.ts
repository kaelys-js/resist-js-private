/**
 * Barrel re-export for the color-variant-selector component —
 * exposes the `ColorVariantSelector` Svelte component, its
 * props type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ColorVariantSelectorProps,
  ColorVariantSelectorPropsSchema,
} from './ColorVariantSelector.svelte';

export {
  Root,
  type ColorVariantSelectorProps,
  ColorVariantSelectorPropsSchema,
  //
  Root as ColorVariantSelector,
};

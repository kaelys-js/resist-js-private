/**
 * Barrel re-export for the color-blind-filter component —
 * exposes the `ColorBlindFilter` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ColorBlindFilterProps,
  ColorBlindFilterPropsSchema,
} from './ColorBlindFilter.svelte';

export {
  Root,
  type ColorBlindFilterProps,
  ColorBlindFilterPropsSchema,
  //
  Root as ColorBlindFilter,
};

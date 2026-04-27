/**
 * Barrel re-export for the color-gradient-picker component —
 * exposes the `ColorGradientPicker` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ColorGradientPickerProps,
  ColorGradientPickerPropsSchema,
} from './ColorGradientPicker.svelte';

export {
  Root,
  type ColorGradientPickerProps,
  ColorGradientPickerPropsSchema,
  //
  Root as ColorGradientPicker,
};

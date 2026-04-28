/**
 * Barrel re-export for the swatch-picker component — exposes
 * the SwatchPicker Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type SwatchPickerProps, SwatchPickerPropsSchema } from './SwatchPicker.svelte';

export {
  Root,
  type SwatchPickerProps,
  SwatchPickerPropsSchema,
  //
  Root as SwatchPicker,
};

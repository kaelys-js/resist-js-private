/**
 * Barrel re-export for the color-field component — exposes the
 * `ColorField` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ColorFieldProps, ColorFieldPropsSchema } from './ColorField.svelte';

export {
  Root,
  type ColorFieldProps,
  ColorFieldPropsSchema,
  //
  Root as ColorField,
};

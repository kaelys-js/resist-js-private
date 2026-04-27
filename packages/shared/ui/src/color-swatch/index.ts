/**
 * Barrel re-export for the color-swatch component — exposes the
 * `ColorSwatch` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ColorSwatchProps, ColorSwatchPropsSchema } from './ColorSwatch.svelte';

export {
  Root,
  type ColorSwatchProps,
  ColorSwatchPropsSchema,
  //
  Root as ColorSwatch,
};

/**
 * Barrel re-export for the color-palette-generator component —
 * exposes the `ColorPaletteGenerator` Svelte component, its
 * props type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ColorPaletteGeneratorProps,
  ColorPaletteGeneratorPropsSchema,
} from './ColorPaletteGenerator.svelte';

export {
  Root,
  type ColorPaletteGeneratorProps,
  ColorPaletteGeneratorPropsSchema,
  //
  Root as ColorPaletteGenerator,
};

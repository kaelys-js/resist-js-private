/**
 * Barrel re-export for the color-wheel component — exposes the
 * `ColorWheel` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ColorWheelProps, ColorWheelPropsSchema } from './ColorWheel.svelte';

export {
  Root,
  type ColorWheelProps,
  ColorWheelPropsSchema,
  //
  Root as ColorWheel,
};

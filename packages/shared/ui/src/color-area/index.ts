/**
 * Barrel re-export for the color-area component — exposes the
 * `ColorArea` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ColorAreaProps, ColorAreaPropsSchema } from './ColorArea.svelte';

export {
  Root,
  type ColorAreaProps,
  ColorAreaPropsSchema,
  //
  Root as ColorArea,
};

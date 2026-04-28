/**
 * Barrel re-export for the gradient-text component — exposes
 * the GradientText Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GradientTextProps, GradientTextPropsSchema } from './GradientText.svelte';

export {
  Root,
  type GradientTextProps,
  GradientTextPropsSchema,
  //
  Root as GradientText,
};

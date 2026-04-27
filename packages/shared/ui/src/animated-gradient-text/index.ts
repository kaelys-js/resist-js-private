/**
 * Barrel re-export for the animated-gradient-text component —
 * exposes the `AnimatedGradientText` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AnimatedGradientTextProps,
  AnimatedGradientTextPropsSchema,
} from './AnimatedGradientText.svelte';

export {
  Root,
  type AnimatedGradientTextProps,
  AnimatedGradientTextPropsSchema,
  //
  Root as AnimatedGradientText,
};

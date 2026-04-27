/**
 * Barrel re-export for the animated-text component — exposes
 * the `AnimatedText` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type AnimatedTextProps, AnimatedTextPropsSchema } from './AnimatedText.svelte';

export {
  Root,
  type AnimatedTextProps,
  AnimatedTextPropsSchema,
  //
  Root as AnimatedText,
};

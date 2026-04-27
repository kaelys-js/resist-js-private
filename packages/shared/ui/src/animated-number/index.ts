/**
 * Barrel re-export for the animated-number component — exposes
 * the `AnimatedNumber` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type AnimatedNumberProps, AnimatedNumberPropsSchema } from './AnimatedNumber.svelte';

export {
  Root,
  type AnimatedNumberProps,
  AnimatedNumberPropsSchema,
  //
  Root as AnimatedNumber,
};

/**
 * Barrel re-export for the animated-background component —
 * exposes the `AnimatedBackground` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AnimatedBackgroundProps,
  AnimatedBackgroundPropsSchema,
} from './AnimatedBackground.svelte';

export {
  Root,
  type AnimatedBackgroundProps,
  AnimatedBackgroundPropsSchema,
  //
  Root as AnimatedBackground,
};

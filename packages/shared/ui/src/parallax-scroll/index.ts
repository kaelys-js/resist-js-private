/**
 * Barrel re-export for the parallax-scroll component —
 * exposes the ParallaxScroll Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ParallaxScrollProps, ParallaxScrollPropsSchema } from './ParallaxScroll.svelte';

export {
  Root,
  type ParallaxScrollProps,
  ParallaxScrollPropsSchema,
  //
  Root as ParallaxScroll,
};

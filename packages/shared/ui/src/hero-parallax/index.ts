/**
 * Barrel re-export for the hero-parallax component — exposes
 * the HeroParallax Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type HeroParallaxProps, HeroParallaxPropsSchema } from './HeroParallax.svelte';

export {
  Root,
  type HeroParallaxProps,
  HeroParallaxPropsSchema,
  //
  Root as HeroParallax,
};

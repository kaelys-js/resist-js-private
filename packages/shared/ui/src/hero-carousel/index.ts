/**
 * Barrel re-export for the hero-carousel component — exposes
 * the HeroCarousel Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type HeroCarouselProps, HeroCarouselPropsSchema } from './HeroCarousel.svelte';

export {
  Root,
  type HeroCarouselProps,
  HeroCarouselPropsSchema,
  //
  Root as HeroCarousel,
};

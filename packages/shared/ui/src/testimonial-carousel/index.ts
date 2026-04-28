/**
 * Barrel re-export for the testimonial-carousel component —
 * exposes the TestimonialCarousel Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type TestimonialCarouselProps,
  TestimonialCarouselPropsSchema,
} from './TestimonialCarousel.svelte';

export {
  Root,
  type TestimonialCarouselProps,
  TestimonialCarouselPropsSchema,
  //
  Root as TestimonialCarousel,
};

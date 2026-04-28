/**
 * Barrel re-export for the testimonial-wall component —
 * exposes the TestimonialWall Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TestimonialWallProps,
  TestimonialWallPropsSchema,
} from './TestimonialWall.svelte';

export {
  Root,
  type TestimonialWallProps,
  TestimonialWallPropsSchema,
  //
  Root as TestimonialWall,
};

/**
 * Barrel re-export for the testimonial-card component —
 * exposes the TestimonialCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TestimonialCardProps,
  TestimonialCardPropsSchema,
} from './TestimonialCard.svelte';

export {
  Root,
  type TestimonialCardProps,
  TestimonialCardPropsSchema,
  //
  Root as TestimonialCard,
};

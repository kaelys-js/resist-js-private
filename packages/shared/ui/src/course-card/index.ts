/**
 * Barrel re-export for the course-card component — exposes the
 * `CourseCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CourseCardProps, CourseCardPropsSchema } from './CourseCard.svelte';

export {
  Root,
  type CourseCardProps,
  CourseCardPropsSchema,
  //
  Root as CourseCard,
};

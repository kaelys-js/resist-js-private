/**
 * Barrel re-export for the lesson-progress component —
 * exposes the LessonProgress Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type LessonProgressProps, LessonProgressPropsSchema } from './LessonProgress.svelte';

export {
  Root,
  type LessonProgressProps,
  LessonProgressPropsSchema,
  //
  Root as LessonProgress,
};

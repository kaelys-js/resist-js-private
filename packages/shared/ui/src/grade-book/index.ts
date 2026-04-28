/**
 * Barrel re-export for the grade-book component — exposes the
 * GradeBook Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GradeBookProps, GradeBookPropsSchema } from './GradeBook.svelte';

export {
  Root,
  type GradeBookProps,
  GradeBookPropsSchema,
  //
  Root as GradeBook,
};

/**
 * Barrel re-export for the curriculum-tree component — exposes
 * the `CurriculumTree` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type CurriculumTreeProps, CurriculumTreePropsSchema } from './CurriculumTree.svelte';

export {
  Root,
  type CurriculumTreeProps,
  CurriculumTreePropsSchema,
  //
  Root as CurriculumTree,
};

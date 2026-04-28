/**
 * Barrel re-export for the skill-tree component — exposes
 * the SkillTree Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SkillTreeProps, SkillTreePropsSchema } from './SkillTree.svelte';

export {
  Root,
  type SkillTreeProps,
  SkillTreePropsSchema,
  //
  Root as SkillTree,
};

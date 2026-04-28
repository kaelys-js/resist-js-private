/**
 * Barrel re-export for the experience-bar component — exposes
 * the ExperienceBar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ExperienceBarProps, ExperienceBarPropsSchema } from './ExperienceBar.svelte';

export {
  Root,
  type ExperienceBarProps,
  ExperienceBarPropsSchema,
  //
  Root as ExperienceBar,
};

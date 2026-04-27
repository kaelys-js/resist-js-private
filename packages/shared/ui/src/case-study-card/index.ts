/**
 * Barrel re-export for the case-study-card component — exposes
 * the `CaseStudyCard` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CaseStudyCardProps, CaseStudyCardPropsSchema } from './CaseStudyCard.svelte';

export {
  Root,
  type CaseStudyCardProps,
  CaseStudyCardPropsSchema,
  //
  Root as CaseStudyCard,
};

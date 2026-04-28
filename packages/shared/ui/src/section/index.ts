/**
 * Barrel re-export for the section component — exposes the
 * Section Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SectionProps, SectionPropsSchema } from './Section.svelte';

export {
  Root,
  type SectionProps,
  SectionPropsSchema,
  //
  Root as Section,
};

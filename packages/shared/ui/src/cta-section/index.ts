/**
 * Barrel re-export for the cta-section component — exposes the
 * `CtaSection` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CtaSectionProps, CtaSectionPropsSchema } from './CtaSection.svelte';

export {
  Root,
  type CtaSectionProps,
  CtaSectionPropsSchema,
  //
  Root as CtaSection,
};

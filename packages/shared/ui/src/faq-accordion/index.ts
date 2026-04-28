/**
 * Barrel re-export for the faq-accordion component — exposes
 * the FaqAccordion Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FaqAccordionProps, FaqAccordionPropsSchema } from './FaqAccordion.svelte';

export {
  Root,
  type FaqAccordionProps,
  FaqAccordionPropsSchema,
  //
  Root as FaqAccordion,
};

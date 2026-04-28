/**
 * Barrel re-export for the page-footer component — exposes
 * the PageFooter Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PageFooterProps, PageFooterPropsSchema } from './PageFooter.svelte';

export {
  Root,
  type PageFooterProps,
  PageFooterPropsSchema,
  //
  Root as PageFooter,
};

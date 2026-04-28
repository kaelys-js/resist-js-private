/**
 * Barrel re-export for the page-sheet component — exposes
 * the PageSheet Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PageSheetProps, PageSheetPropsSchema } from './PageSheet.svelte';

export {
  Root,
  type PageSheetProps,
  PageSheetPropsSchema,
  //
  Root as PageSheet,
};

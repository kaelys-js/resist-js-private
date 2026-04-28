/**
 * Barrel re-export for the page-header component — exposes
 * the PageHeader Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PageHeaderProps, PageHeaderPropsSchema } from './PageHeader.svelte';

export {
  Root,
  type PageHeaderProps,
  PageHeaderPropsSchema,
  //
  Root as PageHeader,
};

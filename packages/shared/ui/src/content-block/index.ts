/**
 * Barrel re-export for the content-block component — exposes
 * the `ContentBlock` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ContentBlockProps, ContentBlockPropsSchema } from './ContentBlock.svelte';

export {
  Root,
  type ContentBlockProps,
  ContentBlockPropsSchema,
  //
  Root as ContentBlock,
};

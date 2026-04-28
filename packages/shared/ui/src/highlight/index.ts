/**
 * Barrel re-export for the highlight component — exposes the
 * Highlight Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HighlightProps, HighlightPropsSchema } from './Highlight.svelte';

export {
  Root,
  type HighlightProps,
  HighlightPropsSchema,
  //
  Root as Highlight,
};

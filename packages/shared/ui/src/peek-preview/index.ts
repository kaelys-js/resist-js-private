/**
 * Barrel re-export for the peek-preview component — exposes
 * the PeekPreview Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PeekPreviewProps, PeekPreviewPropsSchema } from './PeekPreview.svelte';

export {
  Root,
  type PeekPreviewProps,
  PeekPreviewPropsSchema,
  //
  Root as PeekPreview,
};

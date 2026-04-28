/**
 * Barrel re-export for the link-preview component — exposes
 * the LinkPreview Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LinkPreviewProps, LinkPreviewPropsSchema } from './LinkPreview.svelte';

export {
  Root,
  type LinkPreviewProps,
  LinkPreviewPropsSchema,
  //
  Root as LinkPreview,
};

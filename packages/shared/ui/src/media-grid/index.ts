/**
 * Barrel re-export for the media-grid component — exposes
 * the MediaGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MediaGridProps, MediaGridPropsSchema } from './MediaGrid.svelte';

export {
  Root,
  type MediaGridProps,
  MediaGridPropsSchema,
  //
  Root as MediaGrid,
};

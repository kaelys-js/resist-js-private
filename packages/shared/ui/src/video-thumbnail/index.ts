/**
 * Barrel re-export for the video-thumbnail component —
 * exposes the VideoThumbnail Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type VideoThumbnailProps, VideoThumbnailPropsSchema } from './VideoThumbnail.svelte';

export {
  Root,
  type VideoThumbnailProps,
  VideoThumbnailPropsSchema,
  //
  Root as VideoThumbnail,
};

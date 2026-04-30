/**
 * Barrel re-export for the video-player component — exposes
 * the VideoPlayer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type VideoPlayerProps, VideoPlayerPropsSchema } from './VideoPlayer.svelte';

export {
  Root,
  type VideoPlayerProps,
  VideoPlayerPropsSchema,
  //
  Root as VideoPlayer,
};

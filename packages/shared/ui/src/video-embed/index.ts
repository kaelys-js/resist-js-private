/**
 * Barrel re-export for the video-embed component — exposes
 * the VideoEmbed Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type VideoEmbedProps, VideoEmbedPropsSchema } from './VideoEmbed.svelte';

export {
  Root,
  type VideoEmbedProps,
  VideoEmbedPropsSchema,
  //
  Root as VideoEmbed,
};

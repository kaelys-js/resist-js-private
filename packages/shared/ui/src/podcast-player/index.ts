/**
 * Barrel re-export for the podcast-player component — exposes
 * the PodcastPlayer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PodcastPlayerProps, PodcastPlayerPropsSchema } from './PodcastPlayer.svelte';

export {
  Root,
  type PodcastPlayerProps,
  PodcastPlayerPropsSchema,
  //
  Root as PodcastPlayer,
};

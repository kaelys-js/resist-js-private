/**
 * Barrel re-export for the audio-player component — exposes the
 * `AudioPlayer` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AudioPlayerProps, AudioPlayerPropsSchema } from './AudioPlayer.svelte';

export {
  Root,
  type AudioPlayerProps,
  AudioPlayerPropsSchema,
  //
  Root as AudioPlayer,
};

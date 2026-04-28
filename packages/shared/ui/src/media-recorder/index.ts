/**
 * Barrel re-export for the media-recorder component — exposes
 * the MediaRecorder Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MediaRecorderProps, MediaRecorderPropsSchema } from './MediaRecorder.svelte';

export {
  Root,
  type MediaRecorderProps,
  MediaRecorderPropsSchema,
  //
  Root as MediaRecorder,
};

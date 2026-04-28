/**
 * Barrel re-export for the screen-recorder component —
 * exposes the ScreenRecorder Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ScreenRecorderProps, ScreenRecorderPropsSchema } from './ScreenRecorder.svelte';

export {
  Root,
  type ScreenRecorderProps,
  ScreenRecorderPropsSchema,
  //
  Root as ScreenRecorder,
};

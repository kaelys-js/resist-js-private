/**
 * Barrel re-export for the video-background component —
 * exposes the VideoBackground Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type VideoBackgroundProps,
  VideoBackgroundPropsSchema,
} from './VideoBackground.svelte';

export {
  Root,
  type VideoBackgroundProps,
  VideoBackgroundPropsSchema,
  //
  Root as VideoBackground,
};

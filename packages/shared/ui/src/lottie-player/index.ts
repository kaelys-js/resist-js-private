/**
 * Barrel re-export for the lottie-player component — exposes
 * the LottiePlayer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LottiePlayerProps, LottiePlayerPropsSchema } from './LottiePlayer.svelte';

export {
  Root,
  type LottiePlayerProps,
  LottiePlayerPropsSchema,
  //
  Root as LottiePlayer,
};

/**
 * Barrel re-export for the rainbow-button component — exposes
 * the RainbowButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RainbowButtonProps, RainbowButtonPropsSchema } from './RainbowButton.svelte';

export {
  Root,
  type RainbowButtonProps,
  RainbowButtonPropsSchema,
  //
  Root as RainbowButton,
};

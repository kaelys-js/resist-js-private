/**
 * Barrel re-export for the like-button component — exposes
 * the LikeButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LikeButtonProps, LikeButtonPropsSchema } from './LikeButton.svelte';

export {
  Root,
  type LikeButtonProps,
  LikeButtonPropsSchema,
  //
  Root as LikeButton,
};

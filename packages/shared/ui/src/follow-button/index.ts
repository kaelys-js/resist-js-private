/**
 * Barrel re-export for the follow-button component — exposes
 * the FollowButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FollowButtonProps, FollowButtonPropsSchema } from './FollowButton.svelte';

export {
  Root,
  type FollowButtonProps,
  FollowButtonPropsSchema,
  //
  Root as FollowButton,
};

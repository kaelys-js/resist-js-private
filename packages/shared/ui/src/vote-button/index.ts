/**
 * Barrel re-export for the vote-button component — exposes
 * the VoteButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type VoteButtonProps, VoteButtonPropsSchema } from './VoteButton.svelte';

export {
  Root,
  type VoteButtonProps,
  VoteButtonPropsSchema,
  //
  Root as VoteButton,
};

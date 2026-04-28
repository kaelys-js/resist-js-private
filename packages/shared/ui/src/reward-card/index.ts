/**
 * Barrel re-export for the reward-card component — exposes
 * the RewardCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RewardCardProps, RewardCardPropsSchema } from './RewardCard.svelte';

export {
  Root,
  type RewardCardProps,
  RewardCardPropsSchema,
  //
  Root as RewardCard,
};

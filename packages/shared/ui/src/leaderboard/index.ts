/**
 * Barrel re-export for the leaderboard component — exposes
 * the Leaderboard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LeaderboardProps, LeaderboardPropsSchema } from './Leaderboard.svelte';

export {
  Root,
  type LeaderboardProps,
  LeaderboardPropsSchema,
  //
  Root as Leaderboard,
};

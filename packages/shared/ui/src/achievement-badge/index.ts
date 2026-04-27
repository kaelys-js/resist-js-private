/**
 * Barrel re-export for the achievement-badge component — exposes
 * the `AchievementBadge` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AchievementBadgeProps,
  AchievementBadgePropsSchema,
} from './AchievementBadge.svelte';

export {
  Root,
  type AchievementBadgeProps,
  AchievementBadgePropsSchema,
  //
  Root as AchievementBadge,
};

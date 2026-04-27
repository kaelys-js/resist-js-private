/**
 * Barrel re-export for the activity-feed component — exposes the
 * `ActivityFeed` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ActivityFeedProps, ActivityFeedPropsSchema } from './ActivityFeed.svelte';

export {
  Root,
  type ActivityFeedProps,
  ActivityFeedPropsSchema,
  //
  Root as ActivityFeed,
};

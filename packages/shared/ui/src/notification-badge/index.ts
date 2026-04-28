/**
 * Barrel re-export for the notification-badge component —
 * exposes the NotificationBadge Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NotificationBadgeProps,
  NotificationBadgePropsSchema,
} from './NotificationBadge.svelte';

export {
  Root,
  type NotificationBadgeProps,
  NotificationBadgePropsSchema,
  //
  Root as NotificationBadge,
};

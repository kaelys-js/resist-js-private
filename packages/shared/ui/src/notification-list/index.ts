/**
 * Barrel re-export for the notification-list component —
 * exposes the NotificationList Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NotificationListProps,
  NotificationListPropsSchema,
} from './NotificationList.svelte';

export {
  Root,
  type NotificationListProps,
  NotificationListPropsSchema,
  //
  Root as NotificationList,
};

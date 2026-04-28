/**
 * Barrel re-export for the notification component — exposes
 * the Notification Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type NotificationProps, NotificationPropsSchema } from './Notification.svelte';

export {
  Root,
  type NotificationProps,
  NotificationPropsSchema,
  //
  Root as Notification,
};

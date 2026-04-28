/**
 * Barrel re-export for the notification-dot component —
 * exposes the NotificationDot Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NotificationDotProps,
  NotificationDotPropsSchema,
} from './NotificationDot.svelte';

export {
  Root,
  type NotificationDotProps,
  NotificationDotPropsSchema,
  //
  Root as NotificationDot,
};

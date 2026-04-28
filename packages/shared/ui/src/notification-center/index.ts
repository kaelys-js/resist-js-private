/**
 * Barrel re-export for the notification-center component —
 * exposes the NotificationCenter Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NotificationCenterProps,
  NotificationCenterPropsSchema,
} from './NotificationCenter.svelte';

export {
  Root,
  type NotificationCenterProps,
  NotificationCenterPropsSchema,
  //
  Root as NotificationCenter,
};

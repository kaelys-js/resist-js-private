/**
 * Barrel re-export for the push-notification-preview component
 * — exposes the PushNotificationPreview Svelte component, its
 * props type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PushNotificationPreviewProps,
  PushNotificationPreviewPropsSchema,
} from './PushNotificationPreview.svelte';

export {
  Root,
  type PushNotificationPreviewProps,
  PushNotificationPreviewPropsSchema,
  //
  Root as PushNotificationPreview,
};

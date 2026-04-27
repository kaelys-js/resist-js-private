/**
 * Barrel re-export for the camera-feed component — exposes the
 * `CameraFeed` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CameraFeedProps, CameraFeedPropsSchema } from './CameraFeed.svelte';

export {
  Root,
  type CameraFeedProps,
  CameraFeedPropsSchema,
  //
  Root as CameraFeed,
};

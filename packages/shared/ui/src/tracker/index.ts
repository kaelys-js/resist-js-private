/**
 * Barrel re-export for the tracker component — exposes the
 * Tracker Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TrackerProps, TrackerPropsSchema } from './Tracker.svelte';

export {
  Root,
  type TrackerProps,
  TrackerPropsSchema,
  //
  Root as Tracker,
};

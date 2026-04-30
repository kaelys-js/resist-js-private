/**
 * Barrel re-export for the timeline component — exposes the
 * Timeline Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TimelineProps, TimelinePropsSchema } from './Timeline.svelte';

export {
  Root,
  type TimelineProps,
  TimelinePropsSchema,
  //
  Root as Timeline,
};

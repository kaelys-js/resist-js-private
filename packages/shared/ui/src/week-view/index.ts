/**
 * Barrel re-export for the week-view component — exposes
 * the WeekView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WeekViewProps, WeekViewPropsSchema } from './WeekView.svelte';

export {
  Root,
  type WeekViewProps,
  WeekViewPropsSchema,
  //
  Root as WeekView,
};

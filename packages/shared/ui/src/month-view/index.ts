/**
 * Barrel re-export for the month-view component — exposes
 * the MonthView Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MonthViewProps, MonthViewPropsSchema } from './MonthView.svelte';

export {
  Root,
  type MonthViewProps,
  MonthViewPropsSchema,
  //
  Root as MonthView,
};

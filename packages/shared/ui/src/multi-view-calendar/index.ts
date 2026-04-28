/**
 * Barrel re-export for the multi-view-calendar component —
 * exposes the MultiViewCalendar Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MultiViewCalendarProps,
  MultiViewCalendarPropsSchema,
} from './MultiViewCalendar.svelte';

export {
  Root,
  type MultiViewCalendarProps,
  MultiViewCalendarPropsSchema,
  //
  Root as MultiViewCalendar,
};

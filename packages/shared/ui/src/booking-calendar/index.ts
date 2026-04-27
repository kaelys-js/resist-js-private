/**
 * Barrel re-export for the booking-calendar component — exposes
 * the `BookingCalendar` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BookingCalendarProps,
  BookingCalendarPropsSchema,
} from './BookingCalendar.svelte';

export {
  Root,
  type BookingCalendarProps,
  BookingCalendarPropsSchema,
  //
  Root as BookingCalendar,
};

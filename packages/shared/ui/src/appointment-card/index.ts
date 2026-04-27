/**
 * Barrel re-export for the appointment-card component — exposes
 * the `AppointmentCard` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AppointmentCardProps,
  AppointmentCardPropsSchema,
} from './AppointmentCard.svelte';

export {
  Root,
  type AppointmentCardProps,
  AppointmentCardPropsSchema,
  //
  Root as AppointmentCard,
};

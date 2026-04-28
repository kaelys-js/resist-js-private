/**
 * Barrel re-export for the event-card component — exposes the
 * EventCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type EventCardProps, EventCardPropsSchema } from './EventCard.svelte';

export {
  Root,
  type EventCardProps,
  EventCardPropsSchema,
  //
  Root as EventCard,
};

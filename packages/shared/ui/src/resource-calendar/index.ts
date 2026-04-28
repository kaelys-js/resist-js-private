/**
 * Barrel re-export for the resource-calendar component —
 * exposes the ResourceCalendar Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ResourceCalendarProps,
  ResourceCalendarPropsSchema,
} from './ResourceCalendar.svelte';

export {
  Root,
  type ResourceCalendarProps,
  ResourceCalendarPropsSchema,
  //
  Root as ResourceCalendar,
};

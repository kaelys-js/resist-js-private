/**
 * Barrel re-export for the incident-timeline component —
 * exposes the IncidentTimeline Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type IncidentTimelineProps,
  IncidentTimelinePropsSchema,
} from './IncidentTimeline.svelte';

export {
  Root,
  type IncidentTimelineProps,
  IncidentTimelinePropsSchema,
  //
  Root as IncidentTimeline,
};

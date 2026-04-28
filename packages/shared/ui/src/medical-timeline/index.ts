/**
 * Barrel re-export for the medical-timeline component —
 * exposes the MedicalTimeline Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MedicalTimelineProps,
  MedicalTimelinePropsSchema,
} from './MedicalTimeline.svelte';

export {
  Root,
  type MedicalTimelineProps,
  MedicalTimelinePropsSchema,
  //
  Root as MedicalTimeline,
};

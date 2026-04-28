/**
 * Barrel re-export for the patient-card component — exposes
 * the PatientCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PatientCardProps, PatientCardPropsSchema } from './PatientCard.svelte';

export {
  Root,
  type PatientCardProps,
  PatientCardPropsSchema,
  //
  Root as PatientCard,
};

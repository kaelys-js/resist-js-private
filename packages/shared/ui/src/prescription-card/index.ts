/**
 * Barrel re-export for the prescription-card component —
 * exposes the PrescriptionCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PrescriptionCardProps,
  PrescriptionCardPropsSchema,
} from './PrescriptionCard.svelte';

export {
  Root,
  type PrescriptionCardProps,
  PrescriptionCardPropsSchema,
  //
  Root as PrescriptionCard,
};

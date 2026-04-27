/**
 * Barrel re-export for the age-verification component — exposes
 * the `AgeVerification` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AgeVerificationProps,
  AgeVerificationPropsSchema,
} from './AgeVerification.svelte';

export {
  Root,
  type AgeVerificationProps,
  AgeVerificationPropsSchema,
  //
  Root as AgeVerification,
};

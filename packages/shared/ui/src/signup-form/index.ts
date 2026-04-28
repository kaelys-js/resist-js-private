/**
 * Barrel re-export for the signup-form component — exposes
 * the SignupForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SignupFormProps, SignupFormPropsSchema } from './SignupForm.svelte';

export {
  Root,
  type SignupFormProps,
  SignupFormPropsSchema,
  //
  Root as SignupForm,
};

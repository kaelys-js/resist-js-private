/**
 * Barrel re-export for the reset-password-form component —
 * exposes the ResetPasswordForm Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ResetPasswordFormProps,
  ResetPasswordFormPropsSchema,
} from './ResetPasswordForm.svelte';

export {
  Root,
  type ResetPasswordFormProps,
  ResetPasswordFormPropsSchema,
  //
  Root as ResetPasswordForm,
};

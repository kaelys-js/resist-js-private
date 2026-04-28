/**
 * Barrel re-export for the forgot-password-form component —
 * exposes the ForgotPasswordForm Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ForgotPasswordFormProps,
  ForgotPasswordFormPropsSchema,
} from './ForgotPasswordForm.svelte';

export {
  Root,
  type ForgotPasswordFormProps,
  ForgotPasswordFormPropsSchema,
  //
  Root as ForgotPasswordForm,
};

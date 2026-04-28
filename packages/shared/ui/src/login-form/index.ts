/**
 * Barrel re-export for the login-form component — exposes
 * the LoginForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LoginFormProps, LoginFormPropsSchema } from './LoginForm.svelte';

export {
  Root,
  type LoginFormProps,
  LoginFormPropsSchema,
  //
  Root as LoginForm,
};

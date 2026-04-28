/**
 * Barrel re-export for the password-input component — exposes
 * the PasswordInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PasswordInputProps, PasswordInputPropsSchema } from './PasswordInput.svelte';

export {
  Root,
  type PasswordInputProps,
  PasswordInputPropsSchema,
  //
  Root as PasswordInput,
};

/**
 * Barrel re-export for the email-input component — exposes the
 * EmailInput Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type EmailInputProps, EmailInputPropsSchema } from './EmailInput.svelte';

export {
  Root,
  type EmailInputProps,
  EmailInputPropsSchema,
  //
  Root as EmailInput,
};

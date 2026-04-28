/**
 * Barrel re-export for the password-strength component —
 * exposes the PasswordStrength Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PasswordStrengthProps,
  PasswordStrengthPropsSchema,
} from './PasswordStrength.svelte';

export {
  Root,
  type PasswordStrengthProps,
  PasswordStrengthPropsSchema,
  //
  Root as PasswordStrength,
};

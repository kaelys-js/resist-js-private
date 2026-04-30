/**
 * Barrel re-export for the two-factor-auth component —
 * exposes the TwoFactorAuth Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TwoFactorAuthProps, TwoFactorAuthPropsSchema } from './TwoFactorAuth.svelte';

export {
  Root,
  type TwoFactorAuthProps,
  TwoFactorAuthPropsSchema,
  //
  Root as TwoFactorAuth,
};

/**
 * Barrel re-export for the social-login component — exposes
 * the SocialLogin Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SocialLoginProps, SocialLoginPropsSchema } from './SocialLogin.svelte';

export {
  Root,
  type SocialLoginProps,
  SocialLoginPropsSchema,
  //
  Root as SocialLogin,
};

/**
 * Barrel re-export for the social-login-button component —
 * exposes the SocialLoginButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SocialLoginButtonProps,
  SocialLoginButtonPropsSchema,
} from './SocialLoginButton.svelte';

export {
  Root,
  type SocialLoginButtonProps,
  SocialLoginButtonPropsSchema,
  //
  Root as SocialLoginButton,
};

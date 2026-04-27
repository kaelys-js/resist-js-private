/**
 * Barrel re-export for the captcha component — exposes the
 * `Captcha` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CaptchaProps, CaptchaPropsSchema } from './Captcha.svelte';

export {
  Root,
  type CaptchaProps,
  CaptchaPropsSchema,
  //
  Root as Captcha,
};

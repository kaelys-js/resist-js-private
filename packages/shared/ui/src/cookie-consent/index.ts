/**
 * Barrel re-export for the cookie-consent component — exposes
 * the `CookieConsent` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CookieConsentProps, CookieConsentPropsSchema } from './CookieConsent.svelte';

export {
  Root,
  type CookieConsentProps,
  CookieConsentPropsSchema,
  //
  Root as CookieConsent,
};

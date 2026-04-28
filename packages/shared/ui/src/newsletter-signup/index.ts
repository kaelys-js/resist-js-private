/**
 * Barrel re-export for the newsletter-signup component —
 * exposes the NewsletterSignup Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NewsletterSignupProps,
  NewsletterSignupPropsSchema,
} from './NewsletterSignup.svelte';

export {
  Root,
  type NewsletterSignupProps,
  NewsletterSignupPropsSchema,
  //
  Root as NewsletterSignup,
};

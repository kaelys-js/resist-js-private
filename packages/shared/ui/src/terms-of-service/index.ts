/**
 * Barrel re-export for the terms-of-service component —
 * exposes the TermsOfService Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TermsOfServiceProps, TermsOfServicePropsSchema } from './TermsOfService.svelte';

export {
  Root,
  type TermsOfServiceProps,
  TermsOfServicePropsSchema,
  //
  Root as TermsOfService,
};

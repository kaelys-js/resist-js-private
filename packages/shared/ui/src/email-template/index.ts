/**
 * Barrel re-export for the email-template component — exposes
 * the EmailTemplate Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type EmailTemplateProps, EmailTemplatePropsSchema } from './EmailTemplate.svelte';

export {
  Root,
  type EmailTemplateProps,
  EmailTemplatePropsSchema,
  //
  Root as EmailTemplate,
};

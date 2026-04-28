/**
 * Barrel re-export for the email-preview component — exposes
 * the EmailPreview Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type EmailPreviewProps, EmailPreviewPropsSchema } from './EmailPreview.svelte';

export {
  Root,
  type EmailPreviewProps,
  EmailPreviewPropsSchema,
  //
  Root as EmailPreview,
};

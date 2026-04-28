/**
 * Barrel re-export for the privacy-notice component — exposes
 * the PrivacyNotice Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PrivacyNoticeProps, PrivacyNoticePropsSchema } from './PrivacyNotice.svelte';

export {
  Root,
  type PrivacyNoticeProps,
  PrivacyNoticePropsSchema,
  //
  Root as PrivacyNotice,
};

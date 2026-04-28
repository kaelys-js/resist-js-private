/**
 * Barrel re-export for the quota-bar component — exposes the
 * QuotaBar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type QuotaBarProps, QuotaBarPropsSchema } from './QuotaBar.svelte';

export {
  Root,
  type QuotaBarProps,
  QuotaBarPropsSchema,
  //
  Root as QuotaBar,
};

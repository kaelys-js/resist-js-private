/**
 * Barrel re-export for the status-page component — exposes
 * the StatusPage Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StatusPageProps, StatusPagePropsSchema } from './StatusPage.svelte';

export {
  Root,
  type StatusPageProps,
  StatusPagePropsSchema,
  //
  Root as StatusPage,
};

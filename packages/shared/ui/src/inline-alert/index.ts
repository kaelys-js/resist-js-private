/**
 * Barrel re-export for the inline-alert component — exposes
 * the InlineAlert Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type InlineAlertProps, InlineAlertPropsSchema } from './InlineAlert.svelte';

export {
  Root,
  type InlineAlertProps,
  InlineAlertPropsSchema,
  //
  Root as InlineAlert,
};

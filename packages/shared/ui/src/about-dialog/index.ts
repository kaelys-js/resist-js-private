/**
 * Barrel re-export for the about-dialog component — exposes the
 * `AboutDialog` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AboutDialogProps, AboutDialogPropsSchema } from './AboutDialog.svelte';

export {
  Root,
  type AboutDialogProps,
  AboutDialogPropsSchema,
  //
  Root as AboutDialog,
};

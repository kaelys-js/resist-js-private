/**
 * Barrel re-export for the snackbar component — exposes the
 * Snackbar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SnackbarProps, SnackbarPropsSchema } from './Snackbar.svelte';

export {
  Root,
  type SnackbarProps,
  SnackbarPropsSchema,
  //
  Root as Snackbar,
};

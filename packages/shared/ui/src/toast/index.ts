/**
 * Barrel re-export for the toast component — exposes the
 * Toast Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ToastProps, ToastPropsSchema } from './Toast.svelte';

export {
  Root,
  type ToastProps,
  ToastPropsSchema,
  //
  Root as Toast,
};

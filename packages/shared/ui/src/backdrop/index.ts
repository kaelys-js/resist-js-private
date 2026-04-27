/**
 * Barrel re-export for the backdrop component — exposes the
 * `Backdrop` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BackdropProps, BackdropPropsSchema } from './Backdrop.svelte';

export {
  Root,
  type BackdropProps,
  BackdropPropsSchema,
  //
  Root as Backdrop,
};

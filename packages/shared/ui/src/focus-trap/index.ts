/**
 * Barrel re-export for the focus-trap component — exposes the
 * FocusTrap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FocusTrapProps, FocusTrapPropsSchema } from './FocusTrap.svelte';

export {
  Root,
  type FocusTrapProps,
  FocusTrapPropsSchema,
  //
  Root as FocusTrap,
};

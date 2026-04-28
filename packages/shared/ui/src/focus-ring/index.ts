/**
 * Barrel re-export for the focus-ring component — exposes the
 * FocusRing Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FocusRingProps, FocusRingPropsSchema } from './FocusRing.svelte';

export {
  Root,
  type FocusRingProps,
  FocusRingPropsSchema,
  //
  Root as FocusRing,
};

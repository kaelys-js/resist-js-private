/**
 * Barrel re-export for the ripple component — exposes the
 * Ripple Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type RippleProps, RipplePropsSchema } from './Ripple.svelte';

export {
  Root,
  type RippleProps,
  RipplePropsSchema,
  //
  Root as Ripple,
};

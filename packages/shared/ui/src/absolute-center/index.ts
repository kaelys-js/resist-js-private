/**
 * Barrel re-export for the absolute-center component — exposes
 * the `AbsoluteCenter` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type AbsoluteCenterProps, AbsoluteCenterPropsSchema } from './AbsoluteCenter.svelte';

export {
  Root,
  type AbsoluteCenterProps,
  AbsoluteCenterPropsSchema,
  //
  Root as AbsoluteCenter,
};

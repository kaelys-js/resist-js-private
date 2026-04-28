/**
 * Barrel re-export for the float-button component — exposes
 * the FloatButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FloatButtonProps, FloatButtonPropsSchema } from './FloatButton.svelte';

export {
  Root,
  type FloatButtonProps,
  FloatButtonPropsSchema,
  //
  Root as FloatButton,
};

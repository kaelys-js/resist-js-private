/**
 * Barrel re-export for the input-mask component — exposes the
 * InputMask Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type InputMaskProps, InputMaskPropsSchema } from './InputMask.svelte';

export {
  Root,
  type InputMaskProps,
  InputMaskPropsSchema,
  //
  Root as InputMask,
};

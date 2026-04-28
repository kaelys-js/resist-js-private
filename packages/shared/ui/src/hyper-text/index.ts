/**
 * Barrel re-export for the hyper-text component — exposes the
 * HyperText Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HyperTextProps, HyperTextPropsSchema } from './HyperText.svelte';

export {
  Root,
  type HyperTextProps,
  HyperTextPropsSchema,
  //
  Root as HyperText,
};

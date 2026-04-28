/**
 * Barrel re-export for the split-button component — exposes
 * the SplitButton Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SplitButtonProps, SplitButtonPropsSchema } from './SplitButton.svelte';

export {
  Root,
  type SplitButtonProps,
  SplitButtonPropsSchema,
  //
  Root as SplitButton,
};

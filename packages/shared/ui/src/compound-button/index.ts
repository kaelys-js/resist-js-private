/**
 * Barrel re-export for the compound-button component — exposes
 * the `CompoundButton` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type CompoundButtonProps, CompoundButtonPropsSchema } from './CompoundButton.svelte';

export {
  Root,
  type CompoundButtonProps,
  CompoundButtonPropsSchema,
  //
  Root as CompoundButton,
};

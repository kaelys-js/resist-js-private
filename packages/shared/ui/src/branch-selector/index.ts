/**
 * Barrel re-export for the branch-selector component — exposes
 * the `BranchSelector` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BranchSelectorProps, BranchSelectorPropsSchema } from './BranchSelector.svelte';

export {
  Root,
  type BranchSelectorProps,
  BranchSelectorPropsSchema,
  //
  Root as BranchSelector,
};

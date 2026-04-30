/**
 * Barrel re-export for the tri-state-checkbox component —
 * exposes the TriStateCheckbox Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TriStateCheckboxProps,
  TriStateCheckboxPropsSchema,
} from './TriStateCheckbox.svelte';

export {
  Root,
  type TriStateCheckboxProps,
  TriStateCheckboxPropsSchema,
  //
  Root as TriStateCheckbox,
};

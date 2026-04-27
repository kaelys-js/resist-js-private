/**
 * Barrel re-export for the checkbox-group component — exposes
 * the `CheckboxGroup` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CheckboxGroupProps, CheckboxGroupPropsSchema } from './CheckboxGroup.svelte';

export {
  Root,
  type CheckboxGroupProps,
  CheckboxGroupPropsSchema,
  //
  Root as CheckboxGroup,
};

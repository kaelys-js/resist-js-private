/**
 * Barrel re-export for the consent-checkbox component — exposes
 * the `ConsentCheckbox` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ConsentCheckboxProps,
  ConsentCheckboxPropsSchema,
} from './ConsentCheckbox.svelte';

export {
  Root,
  type ConsentCheckboxProps,
  ConsentCheckboxPropsSchema,
  //
  Root as ConsentCheckbox,
};

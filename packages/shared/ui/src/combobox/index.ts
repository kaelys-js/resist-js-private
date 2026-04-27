/**
 * Barrel re-export for the combobox component — exposes the
 * `Combobox` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ComboboxProps, ComboboxPropsSchema } from './Combobox.svelte';

export {
  Root,
  type ComboboxProps,
  ComboboxPropsSchema,
  //
  Root as Combobox,
};

/**
 * Barrel re-export for the listbox component — exposes the
 * Listbox Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ListboxProps, ListboxPropsSchema } from './Listbox.svelte';

export {
  Root,
  type ListboxProps,
  ListboxPropsSchema,
  //
  Root as Listbox,
};

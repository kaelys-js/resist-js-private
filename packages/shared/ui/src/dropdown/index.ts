/**
 * Barrel re-export for the dropdown component — exposes the
 * Dropdown Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DropdownProps, DropdownPropsSchema } from './Dropdown.svelte';

export {
  Root,
  type DropdownProps,
  DropdownPropsSchema,
  //
  Root as Dropdown,
};

/**
 * Barrel re-export for the editable component — exposes the
 * Editable Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type EditableProps, EditablePropsSchema } from './Editable.svelte';

export {
  Root,
  type EditableProps,
  EditablePropsSchema,
  //
  Root as Editable,
};

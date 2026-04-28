/**
 * Barrel re-export for the fieldset component — exposes the
 * Fieldset Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FieldsetProps, FieldsetPropsSchema } from './Fieldset.svelte';

export {
  Root,
  type FieldsetProps,
  FieldsetPropsSchema,
  //
  Root as Fieldset,
};

/**
 * Barrel re-export for the dynamic-form component — exposes
 * the DynamicForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type DynamicFormProps, DynamicFormPropsSchema } from './DynamicForm.svelte';

export {
  Root,
  type DynamicFormProps,
  DynamicFormPropsSchema,
  //
  Root as DynamicForm,
};

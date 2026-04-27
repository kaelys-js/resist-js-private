/**
 * Barrel re-export for the conditional-form component — exposes
 * the `ConditionalForm` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ConditionalFormProps,
  ConditionalFormPropsSchema,
} from './ConditionalForm.svelte';

export {
  Root,
  type ConditionalFormProps,
  ConditionalFormPropsSchema,
  //
  Root as ConditionalForm,
};

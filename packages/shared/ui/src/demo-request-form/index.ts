/**
 * Barrel re-export for the demo-request-form component — exposes
 * the `DemoRequestForm` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DemoRequestFormProps,
  DemoRequestFormPropsSchema,
} from './DemoRequestForm.svelte';

export {
  Root,
  type DemoRequestFormProps,
  DemoRequestFormPropsSchema,
  //
  Root as DemoRequestForm,
};

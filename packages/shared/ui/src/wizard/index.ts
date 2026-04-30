/**
 * Barrel re-export for the wizard component — exposes the
 * Wizard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type WizardProps, WizardPropsSchema } from './Wizard.svelte';

export {
  Root,
  type WizardProps,
  WizardPropsSchema,
  //
  Root as Wizard,
};

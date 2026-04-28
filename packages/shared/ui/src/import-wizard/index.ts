/**
 * Barrel re-export for the import-wizard component — exposes
 * the ImportWizard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ImportWizardProps, ImportWizardPropsSchema } from './ImportWizard.svelte';

export {
  Root,
  type ImportWizardProps,
  ImportWizardPropsSchema,
  //
  Root as ImportWizard,
};

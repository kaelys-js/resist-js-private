/**
 * Barrel re-export for the settings-form component — exposes
 * the SettingsForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SettingsFormProps, SettingsFormPropsSchema } from './SettingsForm.svelte';

export {
  Root,
  type SettingsFormProps,
  SettingsFormPropsSchema,
  //
  Root as SettingsForm,
};

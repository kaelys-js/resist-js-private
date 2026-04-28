/**
 * Barrel re-export for the settings-section component —
 * exposes the SettingsSection Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SettingsSectionProps,
  SettingsSectionPropsSchema,
} from './SettingsSection.svelte';

export {
  Root,
  type SettingsSectionProps,
  SettingsSectionPropsSchema,
  //
  Root as SettingsSection,
};

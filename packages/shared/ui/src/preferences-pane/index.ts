/**
 * Barrel re-export for the preferences-pane component —
 * exposes the PreferencesPane Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PreferencesPaneProps,
  PreferencesPanePropsSchema,
} from './PreferencesPane.svelte';

export {
  Root,
  type PreferencesPaneProps,
  PreferencesPanePropsSchema,
  //
  Root as PreferencesPane,
};

/**
 * Barrel re-export for the environment-switcher component —
 * exposes the EnvironmentSwitcher Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type EnvironmentSwitcherProps,
  EnvironmentSwitcherPropsSchema,
} from './EnvironmentSwitcher.svelte';

export {
  Root,
  type EnvironmentSwitcherProps,
  EnvironmentSwitcherPropsSchema,
  //
  Root as EnvironmentSwitcher,
};

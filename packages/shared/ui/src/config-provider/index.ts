/**
 * Barrel re-export for the config-provider component — exposes
 * the `ConfigProvider` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type ConfigProviderProps, ConfigProviderPropsSchema } from './ConfigProvider.svelte';

export {
  Root,
  type ConfigProviderProps,
  ConfigProviderPropsSchema,
  //
  Root as ConfigProvider,
};

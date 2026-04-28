/**
 * Barrel re-export for the store-locator component — exposes
 * the StoreLocator Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StoreLocatorProps, StoreLocatorPropsSchema } from './StoreLocator.svelte';

export {
  Root,
  type StoreLocatorProps,
  StoreLocatorPropsSchema,
  //
  Root as StoreLocator,
};

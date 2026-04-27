/**
 * Barrel re-export for the consent-manager component — exposes
 * the `ConsentManager` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type ConsentManagerProps, ConsentManagerPropsSchema } from './ConsentManager.svelte';

export {
  Root,
  type ConsentManagerProps,
  ConsentManagerPropsSchema,
  //
  Root as ConsentManager,
};

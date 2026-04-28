/**
 * Barrel re-export for the integration-grid component —
 * exposes the IntegrationGrid Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type IntegrationGridProps,
  IntegrationGridPropsSchema,
} from './IntegrationGrid.svelte';

export {
  Root,
  type IntegrationGridProps,
  IntegrationGridPropsSchema,
  //
  Root as IntegrationGrid,
};

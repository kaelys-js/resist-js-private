/**
 * Barrel re-export for the maintenance-page component —
 * exposes the MaintenancePage Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MaintenancePageProps,
  MaintenancePagePropsSchema,
} from './MaintenancePage.svelte';

export {
  Root,
  type MaintenancePageProps,
  MaintenancePagePropsSchema,
  //
  Root as MaintenancePage,
};

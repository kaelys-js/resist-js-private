/**
 * Barrel re-export for the dashboard-grid component — exposes
 * the `DashboardGrid` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type DashboardGridProps, DashboardGridPropsSchema } from './DashboardGrid.svelte';

export {
  Root,
  type DashboardGridProps,
  DashboardGridPropsSchema,
  //
  Root as DashboardGrid,
};

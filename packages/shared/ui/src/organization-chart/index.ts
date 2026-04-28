/**
 * Barrel re-export for the organization-chart component —
 * exposes the OrganizationChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type OrganizationChartProps,
  OrganizationChartPropsSchema,
} from './OrganizationChart.svelte';

export {
  Root,
  type OrganizationChartProps,
  OrganizationChartPropsSchema,
  //
  Root as OrganizationChart,
};

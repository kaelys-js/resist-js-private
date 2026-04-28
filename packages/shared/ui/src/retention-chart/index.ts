/**
 * Barrel re-export for the retention-chart component —
 * exposes the RetentionChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type RetentionChartProps, RetentionChartPropsSchema } from './RetentionChart.svelte';

export {
  Root,
  type RetentionChartProps,
  RetentionChartPropsSchema,
  //
  Root as RetentionChart,
};

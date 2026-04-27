/**
 * Barrel re-export for the combination-chart component — exposes
 * the `CombinationChart` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CombinationChartProps,
  CombinationChartPropsSchema,
} from './CombinationChart.svelte';

export {
  Root,
  type CombinationChartProps,
  CombinationChartPropsSchema,
  //
  Root as CombinationChart,
};

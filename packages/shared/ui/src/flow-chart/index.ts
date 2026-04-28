/**
 * Barrel re-export for the flow-chart component — exposes the
 * FlowChart Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FlowChartProps, FlowChartPropsSchema } from './FlowChart.svelte';

export {
  Root,
  type FlowChartProps,
  FlowChartPropsSchema,
  //
  Root as FlowChart,
};

/**
 * Barrel re-export for the step-line-chart component —
 * exposes the StepLineChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type StepLineChartProps, StepLineChartPropsSchema } from './StepLineChart.svelte';

export {
  Root,
  type StepLineChartProps,
  StepLineChartPropsSchema,
  //
  Root as StepLineChart,
};

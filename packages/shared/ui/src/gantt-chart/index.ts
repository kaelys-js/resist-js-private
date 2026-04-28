/**
 * Barrel re-export for the gantt-chart component — exposes
 * the GanttChart Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GanttChartProps, GanttChartPropsSchema } from './GanttChart.svelte';

export {
  Root,
  type GanttChartProps,
  GanttChartPropsSchema,
  //
  Root as GanttChart,
};

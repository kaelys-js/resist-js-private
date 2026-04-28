/**
 * Barrel re-export for the marimekko-chart component —
 * exposes the MarimekkoChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type MarimekkoChartProps, MarimekkoChartPropsSchema } from './MarimekkoChart.svelte';

export {
  Root,
  type MarimekkoChartProps,
  MarimekkoChartPropsSchema,
  //
  Root as MarimekkoChart,
};

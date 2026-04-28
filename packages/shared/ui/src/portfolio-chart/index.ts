/**
 * Barrel re-export for the portfolio-chart component —
 * exposes the PortfolioChart Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type PortfolioChartProps, PortfolioChartPropsSchema } from './PortfolioChart.svelte';

export {
  Root,
  type PortfolioChartProps,
  PortfolioChartPropsSchema,
  //
  Root as PortfolioChart,
};

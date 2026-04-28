/**
 * Barrel re-export for the portfolio-grid component — exposes
 * the PortfolioGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PortfolioGridProps, PortfolioGridPropsSchema } from './PortfolioGrid.svelte';

export {
  Root,
  type PortfolioGridProps,
  PortfolioGridPropsSchema,
  //
  Root as PortfolioGrid,
};

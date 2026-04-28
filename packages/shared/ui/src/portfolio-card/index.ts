/**
 * Barrel re-export for the portfolio-card component — exposes
 * the PortfolioCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PortfolioCardProps, PortfolioCardPropsSchema } from './PortfolioCard.svelte';

export {
  Root,
  type PortfolioCardProps,
  PortfolioCardPropsSchema,
  //
  Root as PortfolioCard,
};

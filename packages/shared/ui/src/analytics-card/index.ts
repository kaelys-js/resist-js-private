/**
 * Barrel re-export for the analytics-card component — exposes
 * the `AnalyticsCard` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type AnalyticsCardProps, AnalyticsCardPropsSchema } from './AnalyticsCard.svelte';

export {
  Root,
  type AnalyticsCardProps,
  AnalyticsCardPropsSchema,
  //
  Root as AnalyticsCard,
};

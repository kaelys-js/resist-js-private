/**
 * Barrel re-export for the metric-card component — exposes
 * the MetricCard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MetricCardProps, MetricCardPropsSchema } from './MetricCard.svelte';

export {
  Root,
  type MetricCardProps,
  MetricCardPropsSchema,
  //
  Root as MetricCard,
};

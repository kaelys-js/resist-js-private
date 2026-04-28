/**
 * Barrel re-export for the kpi-card component — exposes the
 * KpiCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type KpiCardProps, KpiCardPropsSchema } from './KpiCard.svelte';

export {
  Root,
  type KpiCardProps,
  KpiCardPropsSchema,
  //
  Root as KpiCard,
};

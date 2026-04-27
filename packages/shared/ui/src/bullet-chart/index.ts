/**
 * Barrel re-export for the bullet-chart component — exposes the
 * `BulletChart` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BulletChartProps, BulletChartPropsSchema } from './BulletChart.svelte';

export {
  Root,
  type BulletChartProps,
  BulletChartPropsSchema,
  //
  Root as BulletChart,
};

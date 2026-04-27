/**
 * Barrel re-export for the arc-gauge component — exposes the
 * `ArcGauge` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ArcGaugeProps, ArcGaugePropsSchema } from './ArcGauge.svelte';

export {
  Root,
  type ArcGaugeProps,
  ArcGaugePropsSchema,
  //
  Root as ArcGauge,
};

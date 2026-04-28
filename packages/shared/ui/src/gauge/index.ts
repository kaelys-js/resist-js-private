/**
 * Barrel re-export for the gauge component — exposes the Gauge
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type GaugeProps, GaugePropsSchema } from './Gauge.svelte';

export {
  Root,
  type GaugeProps,
  GaugePropsSchema,
  //
  Root as Gauge,
};

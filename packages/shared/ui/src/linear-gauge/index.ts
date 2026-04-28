/**
 * Barrel re-export for the linear-gauge component — exposes
 * the LinearGauge Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LinearGaugeProps, LinearGaugePropsSchema } from './LinearGauge.svelte';

export {
  Root,
  type LinearGaugeProps,
  LinearGaugePropsSchema,
  //
  Root as LinearGauge,
};

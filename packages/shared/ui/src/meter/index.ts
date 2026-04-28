/**
 * Barrel re-export for the meter component — exposes the
 * Meter Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MeterProps, MeterPropsSchema } from './Meter.svelte';

export {
  Root,
  type MeterProps,
  MeterPropsSchema,
  //
  Root as Meter,
};

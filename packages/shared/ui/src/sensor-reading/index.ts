/**
 * Barrel re-export for the sensor-reading component — exposes
 * the SensorReading Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type SensorReadingProps, SensorReadingPropsSchema } from './SensorReading.svelte';

export {
  Root,
  type SensorReadingProps,
  SensorReadingPropsSchema,
  //
  Root as SensorReading,
};

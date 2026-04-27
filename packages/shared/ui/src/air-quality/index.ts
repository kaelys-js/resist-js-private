/**
 * Barrel re-export for the air-quality component — exposes the
 * `AirQuality` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AirQualityProps, AirQualityPropsSchema } from './AirQuality.svelte';

export {
  Root,
  type AirQualityProps,
  AirQualityPropsSchema,
  //
  Root as AirQuality,
};

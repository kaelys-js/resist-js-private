/**
 * Barrel re-export for the indicator component — exposes the
 * Indicator Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type IndicatorProps, IndicatorPropsSchema } from './Indicator.svelte';

export {
  Root,
  type IndicatorProps,
  IndicatorPropsSchema,
  //
  Root as Indicator,
};

/**
 * Barrel re-export for the light-dimmer component — exposes
 * the LightDimmer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LightDimmerProps, LightDimmerPropsSchema } from './LightDimmer.svelte';

export {
  Root,
  type LightDimmerProps,
  LightDimmerPropsSchema,
  //
  Root as LightDimmer,
};

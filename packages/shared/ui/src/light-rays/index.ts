/**
 * Barrel re-export for the light-rays component — exposes the
 * LightRays Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LightRaysProps, LightRaysPropsSchema } from './LightRays.svelte';

export {
  Root,
  type LightRaysProps,
  LightRaysPropsSchema,
  //
  Root as LightRays,
};

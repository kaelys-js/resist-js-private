/**
 * Barrel re-export for the body-map component — exposes the
 * `BodyMap` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BodyMapProps, BodyMapPropsSchema } from './BodyMap.svelte';

export {
  Root,
  type BodyMapProps,
  BodyMapPropsSchema,
  //
  Root as BodyMap,
};

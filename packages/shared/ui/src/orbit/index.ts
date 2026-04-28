/**
 * Barrel re-export for the orbit component — exposes the
 * Orbit Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type OrbitProps, OrbitPropsSchema } from './Orbit.svelte';

export {
  Root,
  type OrbitProps,
  OrbitPropsSchema,
  //
  Root as Orbit,
};

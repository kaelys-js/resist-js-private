/**
 * Barrel re-export for the fireworks component — exposes the
 * Fireworks Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FireworksProps, FireworksPropsSchema } from './Fireworks.svelte';

export {
  Root,
  type FireworksProps,
  FireworksPropsSchema,
  //
  Root as Fireworks,
};

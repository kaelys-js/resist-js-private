/**
 * Barrel re-export for the globe component — exposes the
 * Globe Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type GlobeProps, GlobePropsSchema } from './Globe.svelte';

export {
  Root,
  type GlobeProps,
  GlobePropsSchema,
  //
  Root as Globe,
};

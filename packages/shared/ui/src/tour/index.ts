/**
 * Barrel re-export for the tour component — exposes the Tour
 * Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type TourProps, TourPropsSchema } from './Tour.svelte';

export {
  Root,
  type TourProps,
  TourPropsSchema,
  //
  Root as Tour,
};

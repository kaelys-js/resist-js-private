/**
 * Barrel re-export for the roadmap component — exposes the
 * Roadmap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type RoadmapProps, RoadmapPropsSchema } from './Roadmap.svelte';

export {
  Root,
  type RoadmapProps,
  RoadmapPropsSchema,
  //
  Root as Roadmap,
};

/**
 * Barrel re-export for the mind-map component — exposes the
 * MindMap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MindMapProps, MindMapPropsSchema } from './MindMap.svelte';

export {
  Root,
  type MindMapProps,
  MindMapPropsSchema,
  //
  Root as MindMap,
};

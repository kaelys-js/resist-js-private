/**
 * Barrel re-export for the minimap component — exposes the
 * Minimap Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MinimapProps, MinimapPropsSchema } from './Minimap.svelte';

export {
  Root,
  type MinimapProps,
  MinimapPropsSchema,
  //
  Root as Minimap,
};

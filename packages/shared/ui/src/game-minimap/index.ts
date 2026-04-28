/**
 * Barrel re-export for the game-minimap component — exposes
 * the GameMinimap Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GameMinimapProps, GameMinimapPropsSchema } from './GameMinimap.svelte';

export {
  Root,
  type GameMinimapProps,
  GameMinimapPropsSchema,
  //
  Root as GameMinimap,
};

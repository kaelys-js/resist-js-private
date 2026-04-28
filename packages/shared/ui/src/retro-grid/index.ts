/**
 * Barrel re-export for the retro-grid component — exposes
 * the RetroGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RetroGridProps, RetroGridPropsSchema } from './RetroGrid.svelte';

export {
  Root,
  type RetroGridProps,
  RetroGridPropsSchema,
  //
  Root as RetroGrid,
};

/**
 * Barrel re-export for the moving-border component — exposes
 * the MovingBorder Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MovingBorderProps, MovingBorderPropsSchema } from './MovingBorder.svelte';

export {
  Root,
  type MovingBorderProps,
  MovingBorderPropsSchema,
  //
  Root as MovingBorder,
};

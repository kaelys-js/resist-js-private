/**
 * Barrel re-export for the grid-pattern component — exposes
 * the GridPattern Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GridPatternProps, GridPatternPropsSchema } from './GridPattern.svelte';

export {
  Root,
  type GridPatternProps,
  GridPatternPropsSchema,
  //
  Root as GridPattern,
};

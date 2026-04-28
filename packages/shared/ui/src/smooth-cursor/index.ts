/**
 * Barrel re-export for the smooth-cursor component — exposes
 * the SmoothCursor Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SmoothCursorProps, SmoothCursorPropsSchema } from './SmoothCursor.svelte';

export {
  Root,
  type SmoothCursorProps,
  SmoothCursorPropsSchema,
  //
  Root as SmoothCursor,
};

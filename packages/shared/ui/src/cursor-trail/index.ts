/**
 * Barrel re-export for the cursor-trail component — exposes the
 * `CursorTrail` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CursorTrailProps, CursorTrailPropsSchema } from './CursorTrail.svelte';

export {
  Root,
  type CursorTrailProps,
  CursorTrailPropsSchema,
  //
  Root as CursorTrail,
};

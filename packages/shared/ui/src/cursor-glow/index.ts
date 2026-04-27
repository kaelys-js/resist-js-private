/**
 * Barrel re-export for the cursor-glow component — exposes the
 * `CursorGlow` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CursorGlowProps, CursorGlowPropsSchema } from './CursorGlow.svelte';

export {
  Root,
  type CursorGlowProps,
  CursorGlowPropsSchema,
  //
  Root as CursorGlow,
};

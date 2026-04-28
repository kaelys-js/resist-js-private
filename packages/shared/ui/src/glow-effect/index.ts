/**
 * Barrel re-export for the glow-effect component — exposes
 * the GlowEffect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GlowEffectProps, GlowEffectPropsSchema } from './GlowEffect.svelte';

export {
  Root,
  type GlowEffectProps,
  GlowEffectPropsSchema,
  //
  Root as GlowEffect,
};

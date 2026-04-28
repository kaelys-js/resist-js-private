/**
 * Barrel re-export for the glass-card component — exposes the
 * GlassCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GlassCardProps, GlassCardPropsSchema } from './GlassCard.svelte';

export {
  Root,
  type GlassCardProps,
  GlassCardPropsSchema,
  //
  Root as GlassCard,
};

/**
 * Barrel re-export for the glare-card component — exposes the
 * GlareCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type GlareCardProps, GlareCardPropsSchema } from './GlareCard.svelte';

export {
  Root,
  type GlareCardProps,
  GlareCardPropsSchema,
  //
  Root as GlareCard,
};

/**
 * Barrel re-export for the neon-gradient-card component —
 * exposes the NeonGradientCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NeonGradientCardProps,
  NeonGradientCardPropsSchema,
} from './NeonGradientCard.svelte';

export {
  Root,
  type NeonGradientCardProps,
  NeonGradientCardPropsSchema,
  //
  Root as NeonGradientCard,
};

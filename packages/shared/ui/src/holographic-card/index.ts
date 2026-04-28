/**
 * Barrel re-export for the holographic-card component —
 * exposes the HolographicCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type HolographicCardProps,
  HolographicCardPropsSchema,
} from './HolographicCard.svelte';

export {
  Root,
  type HolographicCardProps,
  HolographicCardPropsSchema,
  //
  Root as HolographicCard,
};

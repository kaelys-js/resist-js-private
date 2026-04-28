/**
 * Barrel re-export for the magic-card component — exposes the
 * MagicCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MagicCardProps, MagicCardPropsSchema } from './MagicCard.svelte';

export {
  Root,
  type MagicCardProps,
  MagicCardPropsSchema,
  //
  Root as MagicCard,
};

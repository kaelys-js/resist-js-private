/**
 * Barrel re-export for the embed-card component — exposes the
 * EmbedCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type EmbedCardProps, EmbedCardPropsSchema } from './EmbedCard.svelte';

export {
  Root,
  type EmbedCardProps,
  EmbedCardPropsSchema,
  //
  Root as EmbedCard,
};

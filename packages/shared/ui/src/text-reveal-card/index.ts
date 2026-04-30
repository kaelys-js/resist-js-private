/**
 * Barrel re-export for the text-reveal-card component —
 * exposes the TextRevealCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TextRevealCardProps, TextRevealCardPropsSchema } from './TextRevealCard.svelte';

export {
  Root,
  type TextRevealCardProps,
  TextRevealCardPropsSchema,
  //
  Root as TextRevealCard,
};

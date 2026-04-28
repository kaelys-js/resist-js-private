/**
 * Barrel re-export for the flashcard component — exposes the
 * Flashcard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FlashcardProps, FlashcardPropsSchema } from './Flashcard.svelte';

export {
  Root,
  type FlashcardProps,
  FlashcardPropsSchema,
  //
  Root as Flashcard,
};

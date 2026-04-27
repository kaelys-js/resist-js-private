/**
 * Barrel re-export for the character-sheet component — exposes
 * the `CharacterSheet` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CharacterSheetProps, CharacterSheetPropsSchema } from './CharacterSheet.svelte';

export {
  Root,
  type CharacterSheetProps,
  CharacterSheetPropsSchema,
  //
  Root as CharacterSheet,
};

/**
 * Barrel re-export for the emoji-picker component — exposes
 * the EmojiPicker Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type EmojiPickerProps, EmojiPickerPropsSchema } from './EmojiPicker.svelte';

export {
  Root,
  type EmojiPickerProps,
  EmojiPickerPropsSchema,
  //
  Root as EmojiPicker,
};

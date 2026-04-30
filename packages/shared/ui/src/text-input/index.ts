/**
 * Barrel re-export for the text-input component — exposes
 * the TextInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TextInputProps, TextInputPropsSchema } from './TextInput.svelte';

export {
  Root,
  type TextInputProps,
  TextInputPropsSchema,
  //
  Root as TextInput,
};

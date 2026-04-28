/**
 * Barrel re-export for the prompt-input component — exposes
 * the PromptInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PromptInputProps, PromptInputPropsSchema } from './PromptInput.svelte';

export {
  Root,
  type PromptInputProps,
  PromptInputPropsSchema,
  //
  Root as PromptInput,
};

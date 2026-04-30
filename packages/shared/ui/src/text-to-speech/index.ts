/**
 * Barrel re-export for the text-to-speech component —
 * exposes the TextToSpeech Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type TextToSpeechProps, TextToSpeechPropsSchema } from './TextToSpeech.svelte';

export {
  Root,
  type TextToSpeechProps,
  TextToSpeechPropsSchema,
  //
  Root as TextToSpeech,
};

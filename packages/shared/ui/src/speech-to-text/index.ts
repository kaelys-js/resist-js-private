/**
 * Barrel re-export for the speech-to-text component —
 * exposes the SpeechToText Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SpeechToTextProps, SpeechToTextPropsSchema } from './SpeechToText.svelte';

export {
  Root,
  type SpeechToTextProps,
  SpeechToTextPropsSchema,
  //
  Root as SpeechToText,
};

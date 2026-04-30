/**
 * Barrel re-export for the text-generate-effect component —
 * exposes the TextGenerateEffect Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type TextGenerateEffectProps,
  TextGenerateEffectPropsSchema,
} from './TextGenerateEffect.svelte';

export {
  Root,
  type TextGenerateEffectProps,
  TextGenerateEffectPropsSchema,
  //
  Root as TextGenerateEffect,
};

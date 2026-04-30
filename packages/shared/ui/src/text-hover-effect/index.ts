/**
 * Barrel re-export for the text-hover-effect component —
 * exposes the TextHoverEffect Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TextHoverEffectProps,
  TextHoverEffectPropsSchema,
} from './TextHoverEffect.svelte';

export {
  Root,
  type TextHoverEffectProps,
  TextHoverEffectPropsSchema,
  //
  Root as TextHoverEffect,
};

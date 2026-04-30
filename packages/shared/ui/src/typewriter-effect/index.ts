/**
 * Barrel re-export for the typewriter-effect component —
 * exposes the TypewriterEffect Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TypewriterEffectProps,
  TypewriterEffectPropsSchema,
} from './TypewriterEffect.svelte';

export {
  Root,
  type TypewriterEffectProps,
  TypewriterEffectPropsSchema,
  //
  Root as TypewriterEffect,
};

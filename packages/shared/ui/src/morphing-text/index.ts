/**
 * Barrel re-export for the morphing-text component — exposes
 * the MorphingText Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MorphingTextProps, MorphingTextPropsSchema } from './MorphingText.svelte';

export {
  Root,
  type MorphingTextProps,
  MorphingTextPropsSchema,
  //
  Root as MorphingText,
};

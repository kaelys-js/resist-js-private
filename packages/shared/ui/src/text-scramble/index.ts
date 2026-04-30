/**
 * Barrel re-export for the text-scramble component — exposes
 * the TextScramble Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type TextScrambleProps, TextScramblePropsSchema } from './TextScramble.svelte';

export {
  Root,
  type TextScrambleProps,
  TextScramblePropsSchema,
  //
  Root as TextScramble,
};

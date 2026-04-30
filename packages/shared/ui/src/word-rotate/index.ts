/**
 * Barrel re-export for the word-rotate component — exposes
 * the WordRotate Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WordRotateProps, WordRotatePropsSchema } from './WordRotate.svelte';

export {
  Root,
  type WordRotateProps,
  WordRotatePropsSchema,
  //
  Root as WordRotate,
};

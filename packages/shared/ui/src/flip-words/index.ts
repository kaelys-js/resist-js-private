/**
 * Barrel re-export for the flip-words component — exposes the
 * FlipWords Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FlipWordsProps, FlipWordsPropsSchema } from './FlipWords.svelte';

export {
  Root,
  type FlipWordsProps,
  FlipWordsPropsSchema,
  //
  Root as FlipWords,
};

/**
 * Barrel re-export for the reading-progress component —
 * exposes the ReadingProgress Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ReadingProgressProps,
  ReadingProgressPropsSchema,
} from './ReadingProgress.svelte';

export {
  Root,
  type ReadingProgressProps,
  ReadingProgressPropsSchema,
  //
  Root as ReadingProgress,
};

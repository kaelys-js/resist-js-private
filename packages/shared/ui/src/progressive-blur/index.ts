/**
 * Barrel re-export for the progressive-blur component —
 * exposes the ProgressiveBlur Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ProgressiveBlurProps,
  ProgressiveBlurPropsSchema,
} from './ProgressiveBlur.svelte';

export {
  Root,
  type ProgressiveBlurProps,
  ProgressiveBlurPropsSchema,
  //
  Root as ProgressiveBlur,
};

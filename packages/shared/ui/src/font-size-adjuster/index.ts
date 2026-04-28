/**
 * Barrel re-export for the font-size-adjuster component —
 * exposes the FontSizeAdjuster Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type FontSizeAdjusterProps,
  FontSizeAdjusterPropsSchema,
} from './FontSizeAdjuster.svelte';

export {
  Root,
  type FontSizeAdjusterProps,
  FontSizeAdjusterPropsSchema,
  //
  Root as FontSizeAdjuster,
};

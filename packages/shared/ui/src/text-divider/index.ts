/**
 * Barrel re-export for the text-divider component — exposes
 * the TextDivider Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TextDividerProps, TextDividerPropsSchema } from './TextDivider.svelte';

export {
  Root,
  type TextDividerProps,
  TextDividerPropsSchema,
  //
  Root as TextDivider,
};

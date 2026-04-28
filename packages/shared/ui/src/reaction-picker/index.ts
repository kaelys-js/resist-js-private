/**
 * Barrel re-export for the reaction-picker component —
 * exposes the ReactionPicker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ReactionPickerProps, ReactionPickerPropsSchema } from './ReactionPicker.svelte';

export {
  Root,
  type ReactionPickerProps,
  ReactionPickerPropsSchema,
  //
  Root as ReactionPicker,
};

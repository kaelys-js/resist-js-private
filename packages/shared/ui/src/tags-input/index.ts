/**
 * Barrel re-export for the tags-input component — exposes
 * the TagsInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TagsInputProps, TagsInputPropsSchema } from './TagsInput.svelte';

export {
  Root,
  type TagsInputProps,
  TagsInputPropsSchema,
  //
  Root as TagsInput,
};

/**
 * Barrel re-export for the inline-edit component — exposes
 * the InlineEdit Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type InlineEditProps, InlineEditPropsSchema } from './InlineEdit.svelte';

export {
  Root,
  type InlineEditProps,
  InlineEditPropsSchema,
  //
  Root as InlineEdit,
};

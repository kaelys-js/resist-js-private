/**
 * Barrel re-export for the markdown-editor component —
 * exposes the MarkdownEditor Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type MarkdownEditorProps, MarkdownEditorPropsSchema } from './MarkdownEditor.svelte';

export {
  Root,
  type MarkdownEditorProps,
  MarkdownEditorPropsSchema,
  //
  Root as MarkdownEditor,
};

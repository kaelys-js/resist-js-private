/**
 * Barrel re-export for the rich-text-editor component —
 * exposes the RichTextEditor Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type RichTextEditorProps, RichTextEditorPropsSchema } from './RichTextEditor.svelte';

export {
  Root,
  type RichTextEditorProps,
  RichTextEditorPropsSchema,
  //
  Root as RichTextEditor,
};

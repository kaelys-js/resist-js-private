/**
 * Barrel re-export for the query-editor component — exposes
 * the QueryEditor Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type QueryEditorProps, QueryEditorPropsSchema } from './QueryEditor.svelte';

export {
  Root,
  type QueryEditorProps,
  QueryEditorPropsSchema,
  //
  Root as QueryEditor,
};

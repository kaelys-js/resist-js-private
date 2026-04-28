/**
 * Barrel re-export for the snippet component — exposes the
 * Snippet Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SnippetProps, SnippetPropsSchema } from './Snippet.svelte';

export {
  Root,
  type SnippetProps,
  SnippetPropsSchema,
  //
  Root as Snippet,
};

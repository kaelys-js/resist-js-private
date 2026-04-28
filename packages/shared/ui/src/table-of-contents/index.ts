/**
 * Barrel re-export for the table-of-contents component —
 * exposes the TableOfContents Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TableOfContentsProps,
  TableOfContentsPropsSchema,
} from './TableOfContents.svelte';

export {
  Root,
  type TableOfContentsProps,
  TableOfContentsPropsSchema,
  //
  Root as TableOfContents,
};
